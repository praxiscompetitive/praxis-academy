import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db, enrolments, programmes } from "@/db";
import { pathState } from "@/lib/core";
import { enrol } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireUser();
  const [ps, mine] = await Promise.all([
    db.select().from(programmes).where(eq(programmes.published, true)),
    db.select().from(enrolments).where(eq(enrolments.userId, me.id)),
  ]);
  const has = new Set(mine.map((e) => e.programmeId));
  const enrolled = ps.filter((p) => has.has(p.id));
  const open = ps.filter((p) => !has.has(p.id));
  const states = await Promise.all(enrolled.map((p) => pathState(me.id, p.id)));
  return (
    <>
      <h1>Welcome back, <span className="hot">{me.name.split(" ")[0]}</span></h1>
      <p className="lead">Progress here comes from reviewed evidence, not points.</p>

      {enrolled.map((p, i) => {
        const st = states[i], done = st.filter((m) => m.complete).length;
        const next = st.find((m) => m.unlocked && !m.complete);
        return (
          <section className="card feature" key={p.id} aria-label={p.title}>
            <div className="mark" aria-hidden="true" />
            <div className="fx">
              <span className="tag">Your programme</span>
              <span className="title big">{p.title}</span>
              <p className="next">{next ? <>Next up: <b>{next.code} {next.title}</b></> : "Every module is complete."}</p>
              <div className="pips" role="img" aria-label={`${done} of ${st.length} modules complete`}>{st.map((m) => <i key={m.id} className={m.complete ? "on" : ""} />)}</div>
              <p className="meta muted">{done} of {st.length} modules complete</p>
              <div className="acts">
                <Link className="btn" href={next ? `/m/${next.id}` : `/p/${p.slug}`}>{next ? "Resume" : "Review path"}</Link>
                <Link className="more" href={`/p/${p.slug}`}>Full path</Link>
              </div>
            </div>
          </section>
        );
      })}

      {open.length > 0 && <>
        <h2>{enrolled.length ? "More programmes" : "Choose a programme"}</h2>
        {open.map((p) => (
          <div className="card row" key={p.id}>
            <div><span className="title">{p.title}</span> <span className="tag">v{p.version}</span><p className="muted" style={{ margin: ".35rem 0 0" }}>{p.summary}</p></div>
            <form action={enrol}><input type="hidden" name="id" value={p.id} /><button>Enrol</button></form>
          </div>
        ))}
      </>}
      {ps.length === 0 && <p className="muted">No programmes are published yet.</p>}
    </>
  );
}
