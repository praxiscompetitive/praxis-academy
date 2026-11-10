import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db, programmes } from "@/db";
import { isEnrolled, pathState } from "@/lib/core";

export default async function Path({ params }: { params: Promise<{ slug: string }> }) {
  const me = await requireUser();
  const [p] = await db.select().from(programmes).where(eq(programmes.slug, (await params).slug));
  if (!p || (!p.published && me.role !== "admin")) notFound();
  if (!(await isEnrolled(me.id, p.id))) redirect("/");
  const mods = await pathState(me.id, p.id);
  return (
    <>
      <h1>{p.title}</h1><p className="muted">{p.summary}</p>
      {mods.map((m) => {
        const total = m.lessonsTotal + m.missionsTotal, done = m.lessonsDone + m.passed;
        return (
          <div className={`card ${m.unlocked ? "" : "locked"}`} key={m.id}>
            <div className="row">
              <strong>{m.code} — {m.title}</strong>
              {m.complete ? <span className="tag ok">Complete</span>
                : m.unlocked ? <span className="tag">Available</span>
                : <span className="tag warn">Locked: needs {m.blockedBy.join(", ")}</span>}
            </div>
            <p className="muted">{m.outcome}</p>
            <progress value={done} max={Math.max(total, 1)} aria-label={`${m.code} progress`} />
            <p className="muted">{m.lessonsDone}/{m.lessonsTotal} lessons · {m.passed}/{m.missionsTotal} missions passed</p>
            {m.unlocked && <Link href={`/m/${m.id}`}>Open module</Link>}
          </div>
        );
      })}
    </>
  );
}
