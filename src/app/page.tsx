import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db, enrolments, programmes } from "@/db";
import { enrol } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireUser();
  const [ps, mine] = await Promise.all([
    db.select().from(programmes).where(eq(programmes.published, true)),
    db.select().from(enrolments).where(eq(enrolments.userId, me.id)),
  ]);
  const has = new Set(mine.map((e) => e.programmeId));
  return (
    <>
      <h1>Learn. Build. Prove.</h1>
      <p className="muted">Welcome, {me.name}. Progress here comes from reviewed evidence, not points.</p>
      {ps.length === 0 && <p>No programmes published yet.</p>}
      {ps.map((p) => (
        <div className="card row" key={p.id}>
          <div><strong>{p.title}</strong> <span className="tag">v{p.version}</span><br /><span className="muted">{p.summary}</span></div>
          {has.has(p.id)
            ? <Link className="btn" href={`/p/${p.slug}`}>Continue</Link>
            : <form action={enrol}><input type="hidden" name="id" value={p.id} /><button>Enrol</button></form>}
        </div>
      ))}
    </>
  );
}
