import Link from "next/link";
import { register } from "../actions";

export default async function Register({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <div className="split">
      <aside className="brandpanel">
        <div className="mark" aria-hidden="true" />
        <img src="/praxis-horizontal.svg" alt="Praxis" />
        <div>
          <h1>Start<br />with<br /><span className="hot">proof.</span></h1>
          <p className="lead">Every module ends in real work, reviewed by a person.</p>
        </div>
      </aside>
      <section className="formside">
        <form action={register} className="formbox">
          <h1>Create account</h1>
          {e && <p className="err" role="alert">{e}</p>}
          <label htmlFor="name">Name</label><input id="name" name="name" required autoComplete="name" />
          <label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="password">Password, 10+ characters</label><input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" />
          <p><button style={{ width: "100%" }}>Create account</button></p>
          <p className="muted" style={{ margin: "1rem 0 0" }}>Already registered? <Link href="/login">Sign in</Link></p>
        </form>
      </section>
    </div>
  );
}
