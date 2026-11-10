import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, and } from "drizzle-orm";
import { requireUser } from "@/auth";
import { attempts, db, missions, reviews } from "@/db";
import { assertModuleOpen } from "@/lib/core";
import { submit } from "../../actions";

export default async function Mission({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const [m] = await db.select().from(missions).where(eq(missions.id, (await params).id));
  if (!m) notFound();
  await assertModuleOpen(me.id, m.moduleId);
  const rows = await db.select({ a: attempts, r: reviews }).from(attempts).leftJoin(reviews, eq(reviews.attemptId, attempts.id))
    .where(and(eq(attempts.missionId, m.id), eq(attempts.userId, me.id))).orderBy(asc(attempts.n));
  const last = rows.at(-1)?.a;
  const canSubmit = !last || last.status === "revise";
  return (
    <>
      <p><Link href={`/m/${m.moduleId}`}>← Module</Link></p>
      <h1>{m.title}</h1>
      <div className="card"><pre className="body">{m.brief}</pre><p className="muted">Evidence: {m.evidence} · Passing needs ≥{m.passScore}/3 on every criterion · {m.xp} XP</p></div>
      <h2>Rubric</h2>
      <ul>{m.rubric.map((c) => <li key={c.name}><strong>{c.name}</strong> — {c.description}</li>)}</ul>
      <h2>Attempts</h2>
      {rows.length === 0 && <p className="muted">No attempts yet.</p>}
      {rows.map(({ a, r }) => (
        <div className="card" key={a.id}>
          <div className="row"><strong>Attempt {a.n}</strong><span className={`tag ${a.status === "passed" ? "ok" : a.status === "revise" ? "warn" : ""}`}>{a.status}</span></div>
          <ul>{a.urls.map((u) => <li key={u}><a href={u} rel="noopener noreferrer nofollow" target="_blank">{u}</a></li>)}</ul>
          {a.notes && <p>{a.notes}</p>}
          {r && <p><strong>Feedback:</strong> {r.comment}<br /><span className="muted">Scores: {m.rubric.map((c, i) => `${c.name} ${r.scores[i]}/3`).join(" · ")}</span></p>}
        </div>
      ))}
      {canSubmit
        ? <form action={submit} className="card">
            <h2>{last ? "Resubmit" : "Submit evidence"}</h2>
            <input type="hidden" name="id" value={m.id} />
            <label htmlFor="urls">Evidence URLs (one per line; repository, PR, deployment, docs, video)</label>
            <textarea id="urls" name="urls" rows={3} required placeholder="https://github.com/you/project" />
            <label htmlFor="notes">Reflection / notes</label><textarea id="notes" name="notes" rows={3} />
            <label htmlFor="ai">AI-use disclosure (tools used and how, or &quot;none&quot;)</label><input id="ai" name="ai" />
            <p><button>Submit</button></p>
          </form>
        : last?.status === "passed" ? <p className="tag ok">Passed</p> : <p className="muted">Awaiting review.</p>}
    </>
  );
}
