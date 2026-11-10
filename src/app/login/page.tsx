import Link from "next/link";
import { login } from "../actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <form action={login} className="card narrow">
      <h1>Sign in</h1>
      {e && <p className="err" role="alert">{e}</p>}
      <label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" />
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" />
      <p><button>Sign in</button></p>
      <p className="muted">New here? <Link href="/register">Create an account</Link></p>
    </form>
  );
}
