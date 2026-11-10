import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, attempts, audit, enrolments, evidence, lessonDone, lessons, missions, modules, prereqs, reviews, xpEvents } from "@/db";

export const log = (actorId: string | null, action: string, detail = "") => db.insert(audit).values({ actorId, action, detail });
const award = (userId: string, kind: string, amount: number, ref: string) =>
  db.insert(xpEvents).values({ userId, kind, amount, ref }).onConflictDoNothing();

export type ModuleState = typeof modules.$inferSelect & {
  lessonsDone: number; lessonsTotal: number; passed: number; missionsTotal: number;
  complete: boolean; unlocked: boolean; blockedBy: string[];
};

/** Learner's view of a programme: per-module progress plus prerequisite-based unlock (never XP-based). */
export async function pathState(userId: string, programmeId: string): Promise<ModuleState[]> {
  const mods = await db.select().from(modules).where(eq(modules.programmeId, programmeId)).orderBy(asc(modules.position));
  const ids = mods.map((m) => m.id);
  if (!ids.length) return [];
  const [ls, ms, done, pass, pre] = await Promise.all([
    db.select({ id: lessons.id, moduleId: lessons.moduleId }).from(lessons).where(inArray(lessons.moduleId, ids)),
    db.select({ id: missions.id, moduleId: missions.moduleId }).from(missions).where(inArray(missions.moduleId, ids)),
    db.select({ lessonId: lessonDone.lessonId }).from(lessonDone).where(eq(lessonDone.userId, userId)),
    db.selectDistinct({ missionId: attempts.missionId }).from(attempts).where(and(eq(attempts.userId, userId), eq(attempts.status, "passed"))),
    db.select().from(prereqs).where(inArray(prereqs.moduleId, ids)),
  ]);
  const doneSet = new Set(done.map((d) => d.lessonId)), passSet = new Set(pass.map((p) => p.missionId));
  const base = mods.map((m) => {
    const l = ls.filter((x) => x.moduleId === m.id), mi = ms.filter((x) => x.moduleId === m.id);
    const lessonsDone = l.filter((x) => doneSet.has(x.id)).length, passed = mi.filter((x) => passSet.has(x.id)).length;
    return { ...m, lessonsDone, lessonsTotal: l.length, passed, missionsTotal: mi.length,
      complete: l.length + mi.length > 0 && lessonsDone === l.length && passed === mi.length };
  });
  const byId = new Map(base.map((m) => [m.id, m]));
  return base.map((m) => {
    const blockedBy = pre.filter((p) => p.moduleId === m.id && !byId.get(p.requiresId)?.complete).map((p) => byId.get(p.requiresId)?.code ?? "?");
    return { ...m, blockedBy, unlocked: blockedBy.length === 0 };
  });
}

export async function isEnrolled(userId: string, programmeId: string) {
  return (await db.select().from(enrolments).where(and(eq(enrolments.userId, userId), eq(enrolments.programmeId, programmeId)))).length > 0;
}

/** Throws unless the learner is enrolled and the module's prerequisites are met. */
export async function assertModuleOpen(userId: string, moduleId: string) {
  const [m] = await db.select().from(modules).where(eq(modules.id, moduleId));
  if (!m) throw new Error("Not found");
  if (!(await isEnrolled(userId, m.programmeId))) throw new Error("Enrol in the programme first");
  const s = (await pathState(userId, m.programmeId)).find((x) => x.id === moduleId)!;
  if (!s.unlocked) throw new Error(`Locked: complete ${s.blockedBy.join(", ")} first`);
  return m;
}

export async function completeLesson(userId: string, lessonId: string) {
  const [l] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  if (!l) throw new Error("Not found");
  await assertModuleOpen(userId, l.moduleId);
  await db.insert(lessonDone).values({ userId, lessonId }).onConflictDoNothing();
  await award(userId, "lesson", 10, lessonId);
}

export function parseUrls(raw: string): string[] {
  const urls = raw.split(/\s+/).filter(Boolean);
  if (!urls.length || urls.length > 5) throw new Error("Provide 1-5 evidence URLs");
  for (const u of urls) {
    let p: URL;
    try { p = new URL(u); } catch { throw new Error(`Invalid URL: ${u}`); }
    if (!/^https?:$/.test(p.protocol) || u.length > 500) throw new Error(`Only http(s) URLs allowed: ${u}`);
  }
  return urls;
}

export async function submitAttempt(userId: string, missionId: string, urlsRaw: string, notes: string, aiDisclosure: string) {
  const [mi] = await db.select().from(missions).where(eq(missions.id, missionId));
  if (!mi) throw new Error("Not found");
  await assertModuleOpen(userId, mi.moduleId);
  const urls = parseUrls(urlsRaw);
  const prior = await db.select().from(attempts).where(and(eq(attempts.missionId, missionId), eq(attempts.userId, userId))).orderBy(desc(attempts.n));
  if (prior.some((a) => a.status === "passed")) throw new Error("Already passed");
  if (prior[0]?.status === "submitted") throw new Error("Previous attempt still awaiting review");
  const [a] = await db.insert(attempts).values({
    missionId, userId, n: (prior[0]?.n ?? 0) + 1, urls, notes: notes.slice(0, 4000), aiDisclosure: aiDisclosure.slice(0, 1000),
  }).returning();
  await award(userId, "attempt", 20, a.id); // meaningful attempt, independent of the outcome
  await log(userId, "submit", a.id);
  return a;
}

/** Human review. Pass => competency evidence + XP, which may unlock the next module. Revise => new attempt allowed. */
export async function reviewAttempt(reviewerId: string, attemptId: string, scores: number[], comment: string) {
  const [a] = await db.select().from(attempts).where(eq(attempts.id, attemptId));
  if (!a) throw new Error("Not found");
  if (a.status !== "submitted") throw new Error("Already reviewed");
  if (a.userId === reviewerId) throw new Error("Cannot review your own work");
  const [mi] = await db.select().from(missions).where(eq(missions.id, a.missionId));
  if (scores.length !== mi.rubric.length || scores.some((s) => !Number.isInteger(s) || s < 0 || s > 3)) throw new Error("Score every criterion 0-3");
  if (!comment.trim()) throw new Error("Feedback comment required");
  const pass = scores.every((s) => s >= mi.passScore);
  await db.transaction(async (tx) => {
    await tx.insert(reviews).values({ attemptId, reviewerId, scores, comment, outcome: pass ? "pass" : "revise" });
    await tx.update(attempts).set({ status: pass ? "passed" : "revise" }).where(eq(attempts.id, attemptId));
    if (pass) {
      if (mi.competencyId) await tx.insert(evidence).values({ userId: a.userId, competencyId: mi.competencyId, attemptId }).onConflictDoNothing();
      await tx.insert(xpEvents).values({ userId: a.userId, kind: "mission", amount: mi.xp, ref: mi.id }).onConflictDoNothing();
    }
    await tx.insert(audit).values({ actorId: reviewerId, action: pass ? "review.pass" : "review.revise", detail: attemptId });
  });
}

export async function stats() {
  const [r] = await db.execute<{ learners: number; submitted: number; passed: number; revise: number }>(sql`
    select (select count(*) from users where role='learner')::int learners,
           count(*) filter (where status='submitted')::int submitted,
           count(*) filter (where status='passed')::int passed,
           count(*) filter (where status='revise')::int revise from attempts`);
  return r;
}
