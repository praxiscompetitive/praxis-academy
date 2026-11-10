"use client";
export default function Err({ error, reset }: { error: Error; reset: () => void }) {
  // Server-action errors are masked in production; ours are user-facing messages in dev, generic in prod.
  return <div className="auth"><div className="card"><h1>Something broke</h1><p className="err">{error.message}</p><button onClick={reset}>Try again</button></div></div>;
}
