import { desc, eq, sql } from "drizzle-orm";
import { requireUser } from "@/auth";
import { attempts, competencies, db, evidence, missions, xpEvents } from "@/db";

export const dynamic = "force-dynamic";

// Rank is derived from verified competencies, never from XP.
const RANKS = [[0, "Apprentice"], [3, "Junior Engineer"], [7, "Software Engineer"], [11, "Senior Engineer"]] as const;

export default async function Progress() {
  const me = await requireUser();
  const [[x], ev, work] = await Promise.all([
    db.select({ xp: sql<number>`coalesce(sum(${xpEvents.amount}),0)::int` }).from(xpEvents).where(eq(xpEvents.userId, me.id)),
    db.select({ name: competencies.name, at: evidence.createdAt }).from(evidence).innerJoin(competencies, eq(competencies.id, evidence.competencyId)).where(eq(evidence.userId, me.id)),
    db.select({ a: attempts, m: missions }).from(attempts).innerJoin(missions, eq(missions.id, attempts.missionId)).where(eq(attempts.userId, me.id)).orderBy(desc(attempts.createdAt)),
  ]);
  const rank = [...RANKS].reverse().find(([n]) => ev.length >= n)![1];
  return (
    <>
      <h1>{me.name}</h1>
      <p><span className="tag">{rank}</span> <span className="tag">{x.xp} XP</span> <span className="tag ok">{ev.length} verified competencies</span></p>
      <p className="muted">XP rewards activity. Rank and unlocks come only from reviewed evidence.</p>
      <h2>Portfolio — verified work</h2>
      {work.filter((w) => w.a.status === "passed").map(({ a, m }) => (
        <div className="card" key={a.id}><strong>{m.title}</strong> <span className="tag ok">verified</span>
          <ul>{a.urls.map((u) => <li key={u}><a href={u} rel="noopener noreferrer nofollow" target="_blank">{u}</a></li>)}</ul></div>
      ))}
      {!work.some((w) => w.a.status === "passed") && <p className="muted">Pass a mission to add verified work.</p>}
      <h2>Competencies</h2>
      <ul>{ev.map((e) => <li key={e.name}>{e.name}</li>)}</ul>
      <h2>All attempts</h2>
      <table><thead><tr><th>Mission</th><th>#</th><th>Status</th></tr></thead>
        <tbody>{work.map(({ a, m }) => <tr key={a.id}><td>{m.title}</td><td>{a.n}</td><td>{a.status}</td></tr>)}</tbody></table>
    </>
  );
}
