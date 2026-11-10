import "./globals.css";
import Link from "next/link";
import { auth } from "@/auth";
import { logout } from "./actions";

export const metadata = { title: "Praxis Academy", description: "Learn. Build. Prove." };

export default async function Root({ children }: { children: React.ReactNode }) {
  const s = await auth();
  const role = (s?.user as { role?: string } | undefined)?.role;
  return (
    <html lang="en"><body>
      <a href="#main" className="skip">Skip to content</a>
      <header><nav aria-label="Main">
        <Link href="/" className="brand">Praxis Academy</Link>
        {s?.user && <>
          <Link href="/progress">My progress</Link>
          {(role === "reviewer" || role === "admin") && <Link href="/review">Review queue</Link>}
          {role === "admin" && <Link href="/admin">Admin</Link>}
          <form action={logout}><button className="link">Sign out ({s.user.name})</button></form>
        </>}
      </nav></header>
      <main id="main">{children}</main>
    </body></html>
  );
}
