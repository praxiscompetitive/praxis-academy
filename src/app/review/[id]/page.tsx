import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { attempts, db, missions, reviews, users } from "@/db";
import { review } from "../../actions";

export default async function Review({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("reviewer", "admin");
  const [a] = await db.select().from(attempts).where(eq(attempts.id, (await params).id));
  if (!a) notFound();
  const [[m], [u], hist] = await Promise.all([
    db.select().from(missions).where(eq(missions.id, a.missionId)),
    db.select().from(users).where(eq(users.id, a.userId)),
    db.select({ a: attempts, r: reviews }).from(attempts).leftJoin(reviews, eq(reviews.attemptId, attempts.id)).where(eq(attempts.missionId, a.missionId)).orderBy(asc(attempts.n)),
  ]);
  const prev = hist.filter((h) => h.a.userId === a.userId && h.a.n < a.n);
  return (
    <>
      <Link className="crumb" href="/review">← Reviews</Link>
      <h1>{m.title}</h1><p className="lead">{u.name} · attempt {a.n}</p>
      <div className="card">
        <h2>Evidence</h2>
        <ul>{a.urls.map((x) => <li key={x}><a href={x} rel="noopener noreferrer nofollow" target="_blank">{x}</a></li>)}</ul>
        {a.notes && <p>{a.notes}</p>}
        <p className="muted">AI disclosure: {a.aiDisclosure || "none stated"}</p>
        <p className="muted">Submitted links are untrusted; open them in a safe environment.</p>
      </div>
      {prev.map(({ a: p, r }) => <div className="card" key={p.id}><span className="title">Attempt {p.n}</span> <span className="tag">{r?.outcome}</span><p className="muted" style={{margin:".5rem 0 0"}}>{r?.comment}</p></div>)}
      {a.status !== "submitted" ? <p><span className="tag">Already reviewed</span></p> :
      <form action={review} className="card">
        <input type="hidden" name="id" value={a.id} />
        {m.rubric.map((c, i) => (
          <div key={c.name}><label htmlFor={`c${i}`}>{c.name} <span className="muted">· {c.description}</span></label>
            <select id={`c${i}`} name={`c${i}`} required defaultValue=""><option value="" disabled>Score</option>
              <option value="0">0: missing</option><option value="1">1: weak</option><option value="2">2: meets</option><option value="3">3: strong</option></select></div>
        ))}
        <label htmlFor="comment">Evidence-based feedback</label><textarea id="comment" name="comment" rows={4} required />
        <p className="muted">Pass needs {m.passScore} on every criterion; otherwise the learner is asked to revise.</p>
        <button>Record outcome</button>
      </form>}
    </>
  );
}
