import { pgTable, text, integer, timestamp, jsonb, boolean, primaryKey, uuid, uniqueIndex } from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const ts = (n: string) => timestamp(n, { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: id(), email: text("email").notNull().unique(), name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["learner", "reviewer", "admin"] }).notNull().default("learner"),
  createdAt: ts("created_at"),
});

export const programmes = pgTable("programmes", {
  id: id(), slug: text("slug").notNull().unique(), title: text("title").notNull(), summary: text("summary").notNull().default(""),
  version: integer("version").notNull().default(1), published: boolean("published").notNull().default(false),
});

export const modules = pgTable("modules", {
  id: id(), programmeId: uuid("programme_id").notNull().references(() => programmes.id, { onDelete: "cascade" }),
  code: text("code").notNull(), title: text("title").notNull(), outcome: text("outcome").notNull().default(""),
  position: integer("position").notNull().default(0),
});

// Unlock rule: a module opens once every prerequisite module is complete (all lessons done, all missions passed).
export const prereqs = pgTable("module_prereqs", {
  moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  requiresId: uuid("requires_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.moduleId, t.requiresId] })]);

export const lessons = pgTable("lessons", {
  id: id(), moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  title: text("title").notNull(), body: text("body").notNull().default(""), position: integer("position").notNull().default(0),
});

export const competencies = pgTable("competencies", {
  id: id(), programmeId: uuid("programme_id").notNull().references(() => programmes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const missions = pgTable("missions", {
  id: id(), moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  title: text("title").notNull(), brief: text("brief").notNull(), evidence: text("evidence").notNull().default("Repository or document URL"),
  dueAt: timestamp("due_at", { withTimezone: true }), xp: integer("xp").notNull().default(100),
  rubric: jsonb("rubric").$type<{ name: string; description: string }[]>().notNull(), // each criterion scored 0-3
  passScore: integer("pass_score").notNull().default(2), // every criterion must reach this to pass
  competencyId: uuid("competency_id").references(() => competencies.id),
});

export const enrolments = pgTable("enrolments", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programmeId: uuid("programme_id").notNull().references(() => programmes.id, { onDelete: "cascade" }),
  createdAt: ts("created_at"),
}, (t) => [primaryKey({ columns: [t.userId, t.programmeId] })]);

export const lessonDone = pgTable("lesson_done", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.userId, t.lessonId] })]);

// Every resubmission is a new row; history is never overwritten.
export const attempts = pgTable("attempts", {
  id: id(), missionId: uuid("mission_id").notNull().references(() => missions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  n: integer("n").notNull(), urls: jsonb("urls").$type<string[]>().notNull(), notes: text("notes").notNull().default(""),
  aiDisclosure: text("ai_disclosure").notNull().default(""),
  status: text("status", { enum: ["submitted", "passed", "revise"] }).notNull().default("submitted"),
  createdAt: ts("created_at"),
}, (t) => [uniqueIndex("attempt_n").on(t.missionId, t.userId, t.n)]);

export const reviews = pgTable("reviews", {
  id: id(), attemptId: uuid("attempt_id").notNull().unique().references(() => attempts.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").notNull().references(() => users.id),
  scores: jsonb("scores").$type<number[]>().notNull(), comment: text("comment").notNull(),
  outcome: text("outcome", { enum: ["pass", "revise"] }).notNull(), createdAt: ts("created_at"),
});

// Evidence (competency) and XP are deliberately separate tables: XP never implies competency.
export const evidence = pgTable("evidence", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  competencyId: uuid("competency_id").notNull().references(() => competencies.id, { onDelete: "cascade" }),
  attemptId: uuid("attempt_id").notNull().unique().references(() => attempts.id, { onDelete: "cascade" }),
  createdAt: ts("created_at"),
});

export const xpEvents = pgTable("xp_events", {
  id: id(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), amount: integer("amount").notNull(), ref: text("ref").notNull(), createdAt: ts("created_at"),
}, (t) => [uniqueIndex("xp_once").on(t.userId, t.kind, t.ref)]); // one award per (user, kind, ref): spam-proof

export const audit = pgTable("audit", {
  id: id(), actorId: uuid("actor_id"), action: text("action").notNull(), detail: text("detail").notNull().default(""), createdAt: ts("created_at"),
});
