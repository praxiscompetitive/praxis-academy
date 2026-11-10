import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db, lessonDone, lessons } from "@/db";
import { assertModuleOpen } from "@/lib/core";
import { markLesson } from "../../actions";

export default async function Lesson({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const [l] = await db.select().from(lessons).where(eq(lessons.id, (await params).id));
  if (!l) notFound();
  await assertModuleOpen(me.id, l.moduleId);
  const [d] = await db.select().from(lessonDone).where(and(eq(lessonDone.userId, me.id), eq(lessonDone.lessonId, l.id)));
  return (
    <>
      <Link className="crumb" href={`/m/${l.moduleId}`}>← Module</Link>
      <h1>{l.title}</h1>
      <div className="card"><pre className="body">{l.body}</pre></div>
      {d ? <span className="tag ok">Completed</span>
        : <form action={markLesson}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="next" value={`/m/${l.moduleId}`} /><button>Mark complete (+10 XP)</button></form>}
    </>
  );
}
