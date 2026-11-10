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
      <p className="meta muted">{q.length} waiting</p>
      <h1>Reviews</h1>
      {q.length === 0 && <p className="lead">Nothing waiting. Check back soon.</p>}
      {q.map(({ a, m, u }) => (
        <div className="card row" key={a.id}>
          <div><span className="title">{m.title}</span><p className="muted" style={{margin:".35rem 0 0"}}>{u.name} · attempt {a.n} · {a.createdAt.toLocaleString()}</p></div>
          <Link className="btn" href={`/review/${a.id}`}>Review</Link>
        </div>
      ))}
    </>
  );
}
