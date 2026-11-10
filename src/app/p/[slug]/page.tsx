import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db, programmes } from "@/db";
import { isEnrolled, pathState } from "@/lib/core";

function Row({ unlocked, id, done, children }: { unlocked: boolean; id: string; done: boolean; children: React.ReactNode }) {
  const cls = `card mod${done ? " done" : ""}`;
  return unlocked ? <Link className={cls} href={`/m/${id}`}>{children}</Link> : <div className={`${cls} locked`}>{children}</div>;
}

export default async function Path({ params }: { params: Promise<{ slug: string }> }) {
  const me = await requireUser();
  const [p] = await db.select().from(programmes).where(eq(programmes.slug, (await params).slug));
  if (!p || (!p.published && me.role !== "admin")) notFound();
  if (!(await isEnrolled(me.id, p.id))) redirect("/");
  const mods = await pathState(me.id, p.id);
  const complete = mods.filter((m) => m.complete).length;
  return (
    <>
      <Link className="crumb" href="/">← Learn</Link>
      <h1>{p.title}</h1>
      <p className="lead">{p.summary}</p>
      <p className="meta muted" style={{ marginBottom: "1rem" }}>{complete} of {mods.length} modules complete</p>
      {mods.map((m) => {
        const total = m.lessonsTotal + m.missionsTotal, done = m.lessonsDone + m.passed;
        return (
          <Row unlocked={m.unlocked} id={m.id} done={m.complete} key={m.id}>
            <span className="code">{m.code}</span>
            <div>
              <span className="title">{m.title}</span>
              <p className="muted" style={{ margin: ".25rem 0 0" }}>{m.outcome}</p>
              <div className="pips" role="img" aria-label={`${done} of ${total} done`}>{Array.from({ length: total }, (_, i) => <i key={i} className={i < done ? "on" : ""} />)}</div>
            </div>
            <div className="st">
              {m.complete ? <span className="tag ok">Complete</span>
                : m.unlocked ? <span className="more">Open</span>
                : <span className="tag warn">Needs {m.blockedBy.join(", ")}</span>}
            </div>
          </Row>
        );
      })}
    </>
  );
}
