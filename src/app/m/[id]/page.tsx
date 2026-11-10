import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { attempts, db, lessonDone, lessons, missions, modules, programmes } from "@/db";
import { isEnrolled, pathState } from "@/lib/core";

export default async function Module({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const [m] = await db.select().from(modules).where(eq(modules.id, (await params).id));
  if (!m) notFound();
  const [p] = await db.select().from(programmes).where(eq(programmes.id, m.programmeId));
  if (!(await isEnrolled(me.id, m.programmeId))) redirect("/");
  const st = (await pathState(me.id, m.programmeId)).find((x) => x.id === m.id)!;
  if (!st.unlocked) return <div className="auth"><div className="card"><h1>{m.code} is locked</h1><p className="muted">Complete {st.blockedBy.join(", ")} first.</p><Link className="btn alt" href={`/p/${p.slug}`}>Back to path</Link></div></div>;
  const [ls, ms, done, att] = await Promise.all([
    db.select().from(lessons).where(eq(lessons.moduleId, m.id)).orderBy(asc(lessons.position)),
    db.select().from(missions).where(eq(missions.moduleId, m.id)),
    db.select().from(lessonDone).where(eq(lessonDone.userId, me.id)),
    db.select().from(attempts).where(eq(attempts.userId, me.id)),
  ]);
  const doneSet = new Set(done.map((d) => d.lessonId));
  return (
    <>
      <Link className="crumb" href={`/p/${p.slug}`}>← {p.title}</Link>
      <p className="meta muted">{m.code}</p>
      <h1>{m.title}</h1><p className="lead">{m.outcome}</p>
      <h2>Lessons</h2>
      {ls.map((l) => <Link className="card row" key={l.id} href={`/l/${l.id}`}><span className="title">{l.title}</span>{doneSet.has(l.id) && <span className="tag ok">Done</span>}</Link>)}
      <h2>Missions</h2>
      {ms.map((x) => {
        const mine = att.filter((a) => a.missionId === x.id).sort((a, b) => b.n - a.n)[0];
        return <Link className="card row" key={x.id} href={`/mission/${x.id}`}><span className="title">{x.title}</span>
          <span className={`tag ${mine?.status === "passed" ? "ok" : mine ? "warn" : ""}`}>{mine?.status === "revise" ? "revision requested" : mine?.status ?? "not started"}</span></Link>;
      })}
    </>
  );
}
