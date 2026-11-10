import "./globals.css";
import Link from "next/link";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import { BookOpen, ClipboardText, GearSix, SignOut, Trophy } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/auth";
import { logout } from "./actions";
import NavLink from "./nav-link";

const display = Barlow_Condensed({ subsets: ["latin"], weight: "800", variable: "--font-display" });
const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], weight: "500", variable: "--font-mono" });

export const metadata = { title: "Praxis Academy", description: "Learn. Build. Prove." };

const ic = { size: 20, weight: "regular" as const };

export default async function Root({ children }: { children: React.ReactNode }) {
  const s = await auth();
  const user = s?.user;
  const role = (user as { role?: string } | undefined)?.role;
  const initials = (user?.name ?? "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}><body>
      <a href="#main" className="skip">Skip to content</a>
      {user ? (
        <div className="shell">
          <aside className="side">
            <Link href="/" className="brand" aria-label="Praxis Academy home"><img src="/praxis-horizontal.svg" alt="Praxis" /></Link>
            <nav aria-label="Main">
              <NavLink href="/" label="Learn" icon={<BookOpen {...ic} />} match={["/p/", "/m/", "/l/", "/mission/"]} />
              <NavLink href="/progress" label="Progress" icon={<Trophy {...ic} />} />
              {(role === "reviewer" || role === "admin") && <NavLink href="/review" label="Reviews" icon={<ClipboardText {...ic} />} />}
              {role === "admin" && <NavLink href="/admin" label="Admin" icon={<GearSix {...ic} />} />}
            </nav>
            <div className="me">
              <span className="avatar" aria-hidden="true">{initials}</span>
              <span className="me-text"><b>{user.name}</b><span>{role}</span></span>
              <form action={logout}><button className="icon-btn" aria-label="Sign out" title="Sign out"><SignOut {...ic} /></button></form>
            </div>
          </aside>
          <main id="main" className="page">{children}</main>
        </div>
      ) : <main id="main">{children}</main>}
    </body></html>
  );
}
