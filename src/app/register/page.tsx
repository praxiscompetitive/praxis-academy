import Link from "next/link";
import { register } from "../actions";

export default async function Register({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <form action={register} className="card narrow">
      <h1>Create account</h1>
      {e && <p className="err" role="alert">{e}</p>}
      <label htmlFor="name">Name</label><input id="name" name="name" required autoComplete="name" />
      <label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" />
      <label htmlFor="password">Password (10+ characters)</label><input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" />
      <p><button>Create account</button></p>
      <p className="muted">Already registered? <Link href="/login">Sign in</Link></p>
    </form>
  );
}
