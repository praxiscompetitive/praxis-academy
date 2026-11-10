import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { attempts, db, missions, users } from "@/db";

export const dynamic = "force-dynamic";

export default async function Queue() {
  await requireUser("reviewer", "admin");
  const q = await db.select({ a: attempts, m: missions, u: users }).from(attempts)
    .innerJoin(missions, eq(missions.id, attempts.missionId)).innerJoin(users, eq(users.id, attempts.userId))
    .where(eq(attempts.status, "submitted")).orderBy(asc(attempts.createdAt));
  return (
    <>
      <h1>Review queue ({q.length})</h1>
      {q.length === 0 && <p className="muted">Nothing waiting.</p>}
      {q.map(({ a, m, u }) => (
        <div className="card row" key={a.id}>
          <div><strong>{m.title}</strong> — {u.name}, attempt {a.n}<br /><span className="muted">{a.createdAt.toLocaleString()}</span></div>
          <Link className="btn" href={`/review/${a.id}`}>Review</Link>
        </div>
      ))}
    </>
  );
}
