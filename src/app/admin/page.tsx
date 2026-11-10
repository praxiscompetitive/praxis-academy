import { asc, eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { audit, db, modules, programmes } from "@/db";
import { stats } from "@/lib/core";
import { addLesson, addMission, addModule, addProgramme, togglePublish } from "../actions";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function Admin() {
  await requireUser("admin");
  const [ps, mods, st, log] = await Promise.all([
    db.select().from(programmes), db.select().from(modules).orderBy(asc(modules.position)), stats(),
    db.select().from(audit).orderBy(desc(audit.createdAt)).limit(15),
  ]);
  return (
    <>
      <p className="meta muted">Console</p>
      <h1>Admin</h1>
      <div className="stat">
        {([[st.learners, "Learners"], [st.submitted, "Awaiting review"], [st.passed, "Passed"], [st.revise, "Need revision"]] as const).map(([n, l]) => <div className="card" key={l}><span className="n">{n}</span><span className="meta muted">{l}</span></div>)}
      </div>

      <h2>Programmes</h2>
      {ps.map((p) => (
        <form action={togglePublish} className="card row" key={p.id}>
          <input type="hidden" name="id" value={p.id} />
          <span><span className="title">{p.title}</span> <span className="tag">v{p.version}</span> <span className="muted">{mods.filter((m) => m.programmeId === p.id).length} modules</span></span>
          <button className="alt">{p.published ? "Unpublish" : "Publish"}</button>
        </form>
      ))}
      <form action={addProgramme} className="card">
        <label htmlFor="pt">New programme title</label><input id="pt" name="title" required />
        <label htmlFor="ps">Summary</label><input id="ps" name="summary" />
        <p><button>Create programme</button></p>
      </form>

      <h2>Add module</h2>
      <form action={addModule} className="card">
        <label htmlFor="mp">Programme</label><select id="mp" name="programmeId">{ps.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
        <label htmlFor="mc">Code</label><input id="mc" name="code" required placeholder="M13" />
        <label htmlFor="mt">Title</label><input id="mt" name="title" required />
        <label htmlFor="mo">Outcome</label><input id="mo" name="outcome" />
        <label htmlFor="mr">Prerequisite modules (cmd or ctrl-click for several)</label>
        <select id="mr" name="requires" multiple size={5}>{mods.map((m) => <option key={m.id} value={m.id}>{m.code} {m.title}</option>)}</select>
        <p><button>Add module</button></p>
      </form>

      <h2>Add lesson</h2>
      <form action={addLesson} className="card">
        <label htmlFor="lm">Module</label><select id="lm" name="moduleId">{mods.map((m) => <option key={m.id} value={m.id}>{m.code} {m.title}</option>)}</select>
        <label htmlFor="lt">Title</label><input id="lt" name="title" required />
        <label htmlFor="lb">Body</label><textarea id="lb" name="body" rows={5} />
        <p><button>Add lesson</button></p>
      </form>

      <h2>Add mission</h2>
      <form action={addMission} className="card">
        <label htmlFor="xm">Module</label><select id="xm" name="moduleId">{mods.map((m) => <option key={m.id} value={m.id}>{m.code} {m.title}</option>)}</select>
        <label htmlFor="xt">Title</label><input id="xt" name="title" required />
        <label htmlFor="xb">Brief</label><textarea id="xb" name="brief" rows={4} required />
        <label htmlFor="xe">Evidence required</label><input id="xe" name="evidenceReq" />
        <label htmlFor="xc">Competency awarded on pass</label><input id="xc" name="competency" />
        <label htmlFor="xx">XP</label><input id="xx" name="xp" type="number" defaultValue={100} />
        <label htmlFor="xr">Rubric (one &quot;Criterion: description&quot; per line)</label><textarea id="xr" name="rubric" rows={5} required />
        <p><button>Add mission</button></p>
      </form>

      <h2>Recent audit events</h2>
      <div className="card"><table><tbody>{log.map((l) => <tr key={l.id}><td>{l.createdAt.toLocaleString()}</td><td>{l.action}</td><td className="muted">{l.detail}</td></tr>)}</tbody></table></div>
    </>
  );
}
