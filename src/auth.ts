import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { redirect } from "next/navigation";

type Role = "learner" | "reviewer" | "admin";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" }, // stateless: fits Vercel serverless, no session table
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [Credentials({
    async authorize(c) {
      const [u] = await db.select().from(users).where(eq(users.email, String(c.email ?? "").toLowerCase().trim()));
      if (!u || !(await bcrypt.compare(String(c.password ?? ""), u.passwordHash))) return null;
      return { id: u.id, name: u.name, email: u.email, role: u.role } as never;
    },
  })],
  callbacks: {
    jwt: ({ token, user }) => { if (user) { token.uid = user.id; token.role = (user as { role: Role }).role; } return token; },
    session: ({ session, token }) => { Object.assign(session.user, { id: token.uid, role: token.role }); return session; },
  },
});

export type Me = { id: string; name: string; role: Role };

/** Server-side authz: every page/action calls this. Roles are re-read from the DB, not trusted from the token. */
export async function requireUser(...roles: Role[]): Promise<Me> {
  const s = await auth();
  const id = (s?.user as { id?: string } | undefined)?.id;
  if (!id) redirect("/login");
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u) redirect("/login");
  if (roles.length && !roles.includes(u.role)) redirect("/");
  return { id: u.id, name: u.name, role: u.role };
}
