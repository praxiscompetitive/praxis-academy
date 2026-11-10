import Link from "next/link";
import { login } from "../actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <div className="split">
      <aside className="brandpanel">
        <div className="mark" aria-hidden="true" />
        <img src="/praxis-horizontal.svg" alt="Praxis" />
        <div>
          <h1>Learn.<br />Build.<br /><span className="hot">Prove.</span></h1>
          <p className="lead">Progress here comes from reviewed evidence, not points.</p>
        </div>
      </aside>
      <section className="formside">
        <form action={login} className="formbox">
          <h1>Sign in</h1>
          {e && <p className="err" role="alert">{e}</p>}
          <label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" />
          <p><button style={{ width: "100%" }}>Sign in</button></p>
          <p className="muted" style={{ margin: "1rem 0 0" }}>New here? <Link href="/register">Create an account</Link></p>
        </form>
      </section>
    </div>
  );
}
