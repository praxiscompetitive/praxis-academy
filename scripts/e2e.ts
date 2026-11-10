// End-to-end check of the learning loop against the real DB (run after db:seed).
import assert from "node:assert/strict";
import { and, eq, sql } from "drizzle-orm";
import { attempts, db, evidence, lessons, missions, modules, programmes, users, xpEvents } from "../src/db";
import { assertModuleOpen, completeLesson, pathState, reviewAttempt, submitAttempt } from "../src/lib/core";

const rejects = async (p: Promise<unknown>, re: RegExp) => assert.rejects(p, re);
const [learner] = await db.select().from(users).where(eq(users.email, "learner@praxis.test"));
const [rev] = await db.select().from(users).where(eq(users.email, "reviewer@praxis.test"));
const [prog] = await db.select().from(programmes).where(eq(programmes.slug, "praxis-se"));
await db.delete(attempts).where(eq(attempts.userId, learner.id)); // reset learner (cascades evidence); lessons/xp below
for (const t of ["lesson_done", "xp_events", "enrolments"]) await db.execute(sql`delete from ${sql.identifier(t)} where user_id=${learner.id}`);
const mod = async (code: string) => (await db.select().from(modules).where(and(eq(modules.programmeId, prog.id), eq(modules.code, code))))[0];
const [m02, m03, m04] = [await mod("M02"), await mod("M03"), await mod("M04")];

// not enrolled => blocked
await rejects(assertModuleOpen(learner.id, m02.id), /Enrol/);
await db.execute(sql`insert into enrolments (user_id, programme_id) values (${learner.id}, ${prog.id})`);

// prerequisites gate M04
await assertModuleOpen(learner.id, m02.id);
await rejects(assertModuleOpen(learner.id, m04.id), /Locked: complete M02, M03/);

// XP alone must not unlock: complete all lessons of M02 (XP earned) but no mission
for (const l of await db.select().from(lessons).where(eq(lessons.moduleId, m02.id))) await completeLesson(learner.id, l.id);
await completeLesson(learner.id, (await db.select().from(lessons).where(eq(lessons.moduleId, m02.id)))[0].id); // idempotent XP
const xp = async () => Number((await db.select({ s: sql`coalesce(sum(amount),0)` }).from(xpEvents).where(eq(xpEvents.userId, learner.id)))[0].s);
assert.equal(await xp(), 20);
assert.equal((await pathState(learner.id, prog.id)).find((m) => m.code === "M02")!.complete, false);

// URL validation at the trust boundary
const [mi02] = await db.select().from(missions).where(eq(missions.moduleId, m02.id));
await rejects(submitAttempt(learner.id, mi02.id, "javascript:alert(1)", "", ""), /Only http/);
await rejects(submitAttempt(learner.id, mi02.id, "", "", ""), /1-5/);

// submit -> cannot double submit -> reviewer says revise -> resubmit -> pass
const a1 = await submitAttempt(learner.id, mi02.id, "https://github.com/x/y", "notes", "none");
await rejects(submitAttempt(learner.id, mi02.id, "https://github.com/x/y", "", ""), /awaiting review/);
await rejects(reviewAttempt(learner.id, a1.id, [3, 3, 3, 3, 3], "self"), /own work/);
await rejects(reviewAttempt(rev.id, a1.id, [3, 3, 3], "short rubric"), /Score every/);
await reviewAttempt(rev.id, a1.id, [3, 3, 1, 3, 3], "Add tests");
await rejects(reviewAttempt(rev.id, a1.id, [3, 3, 3, 3, 3], "again"), /Already reviewed/);
assert.equal((await db.select().from(attempts).where(eq(attempts.id, a1.id)))[0].status, "revise");
assert.equal((await db.select().from(evidence).where(eq(evidence.userId, learner.id))).length, 0); // revise => no competency
const a2 = await submitAttempt(learner.id, mi02.id, "https://github.com/x/y/pull/2", "tests added", "none");
assert.equal(a2.n, 2);
await reviewAttempt(rev.id, a2.id, [2, 2, 2, 3, 2], "Good");
assert.equal((await db.select().from(evidence).where(eq(evidence.userId, learner.id))).length, 1);
assert.equal(await xp(), 20 + 20 + 20 + 100); // lessons + 2 attempts + mission
await rejects(submitAttempt(learner.id, mi02.id, "https://a.b", "", ""), /Already passed/);

// M02 complete, M03 still needed for M04
let st = await pathState(learner.id, prog.id);
assert.equal(st.find((m) => m.code === "M02")!.complete, true);
await rejects(assertModuleOpen(learner.id, m04.id), /M03/);

// finish M03 => M04 unlocks
for (const l of await db.select().from(lessons).where(eq(lessons.moduleId, m03.id))) await completeLesson(learner.id, l.id);
const [mi03] = await db.select().from(missions).where(eq(missions.moduleId, m03.id));
const b = await submitAttempt(learner.id, mi03.id, "https://github.com/x/z", "", "Copilot for boilerplate");
await reviewAttempt(rev.id, b.id, [3, 3, 3, 3, 3], "Great");
await assertModuleOpen(learner.id, m04.id);
st = await pathState(learner.id, prog.id);
assert.deepEqual(st.filter((m) => m.unlocked).map((m) => m.code).sort(), ["M01", "M02", "M03", "M04", "M05", "M07", "M09", "M10", "M11", "M12"].sort());
console.log("e2e OK");
process.exit(0);
