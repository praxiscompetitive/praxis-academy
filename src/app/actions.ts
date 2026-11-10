"use server";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { signIn, signOut, requireUser } from "@/auth";
import { competencies, db, enrolments, lessons, missions, modules, prereqs, programmes, users } from "@/db";
import { completeLesson, log, reviewAttempt, submitAttempt } from "@/lib/core";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function register(f: FormData) {
  const email = s(f, "email").toLowerCase(), name = s(f, "name"), pw = s(f, "password");
  if (!/^\S+@\S+\.\S+$/.test(email) || !name || pw.length < 10) redirect("/register?e=Valid+email,+name+and+a+10%2B+character+password+required");
  const [u] = await db.insert(users).values({ email, name, passwordHash: await bcrypt.hash(pw, 10) }).onConflictDoNothing().returning();
  if (!u) redirect("/register?e=Email+already+registered");
  await log(u.id, "register");
  await signIn("credentials", { email, password: pw, redirectTo: "/" });
}

export async function login(f: FormData) {
  try { await signIn("credentials", { email: s(f, "email"), password: s(f, "password"), redirectTo: "/" }); }
  catch (e) { if (e instanceof AuthError) redirect("/login?e=Invalid+email+or+password"); throw e; }
}

export async function logout() { await signOut({ redirectTo: "/login" }); }

export async function enrol(f: FormData) {
  const me = await requireUser();
  const [p] = await db.select().from(programmes).where(eq(programmes.id, s(f, "id")));
  if (!p?.published) throw new Error("Programme not available");
  await db.insert(enrolments).values({ userId: me.id, programmeId: p.id }).onConflictDoNothing();
  await log(me.id, "enrol", p.id);
  redirect(`/p/${p.slug}`);
}

export async function markLesson(f: FormData) {
  const me = await requireUser();
  await completeLesson(me.id, s(f, "id"));
  revalidatePath("/", "layout");
  redirect(s(f, "next") || "/");
}

export async function submit(f: FormData) {
  const me = await requireUser();
  await submitAttempt(me.id, s(f, "id"), s(f, "urls"), s(f, "notes"), s(f, "ai"));
  redirect(`/mission/${s(f, "id")}`);
}

export async function review(f: FormData) {
  const me = await requireUser("reviewer", "admin");
  const scores = [...f.keys()].filter((k) => k.startsWith("c")).sort((a, b) => +a.slice(1) - +b.slice(1)).map((k) => Number(f.get(k)));
  await reviewAttempt(me.id, s(f, "id"), scores, s(f, "comment"));
  redirect("/review");
}

/* ---- admin: content as data, no deploy needed ---- */
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function addProgramme(f: FormData) {
  const me = await requireUser("admin");
  const [p] = await db.insert(programmes).values({ title: s(f, "title"), slug: slug(s(f, "title")), summary: s(f, "summary") }).returning();
  await log(me.id, "programme.create", p.id);
  revalidatePath("/admin");
}

export async function togglePublish(f: FormData) {
  const me = await requireUser("admin");
  await db.update(programmes).set({ published: sql`not ${programmes.published}`, version: sql`${programmes.version} + 1` }).where(eq(programmes.id, s(f, "id")));
  await log(me.id, "programme.publish-toggle", s(f, "id"));
  revalidatePath("/", "layout");
}

export async function addModule(f: FormData) {
  const me = await requireUser("admin");
  const pid = s(f, "programmeId");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(modules).where(eq(modules.programmeId, pid));
  const [m] = await db.insert(modules).values({ programmeId: pid, code: s(f, "code"), title: s(f, "title"), outcome: s(f, "outcome"), position: n }).returning();
  const req = f.getAll("requires").map(String).filter(Boolean);
  if (req.length) await db.insert(prereqs).values(req.map((requiresId) => ({ moduleId: m.id, requiresId })));
  await log(me.id, "module.create", m.id);
  revalidatePath("/admin");
}

export async function addLesson(f: FormData) {
  const me = await requireUser("admin");
  const mid = s(f, "moduleId");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(lessons).where(eq(lessons.moduleId, mid));
  const [l] = await db.insert(lessons).values({ moduleId: mid, title: s(f, "title"), body: s(f, "body"), position: n }).returning();
  await log(me.id, "lesson.create", l.id);
  revalidatePath("/admin");
}

export async function addMission(f: FormData) {
  const me = await requireUser("admin");
  // rubric textarea: one "Name: description" per line
  const rubric = s(f, "rubric").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [name, ...d] = l.split(":"); return { name: name.trim(), description: d.join(":").trim() }; });
  if (!rubric.length) throw new Error("Rubric needs at least one criterion");
  const mid = s(f, "moduleId");
  const [mod] = await db.select().from(modules).where(eq(modules.id, mid));
  const [c] = await db.insert(competencies).values({ programmeId: mod.programmeId, name: s(f, "competency") || s(f, "title") }).returning();
  const [mi] = await db.insert(missions).values({ moduleId: mid, title: s(f, "title"), brief: s(f, "brief"), evidence: s(f, "evidenceReq") || undefined, rubric, competencyId: c.id, xp: Number(s(f, "xp")) || 100 }).returning();
  await log(me.id, "mission.create", mi.id);
  revalidatePath("/admin");
}
