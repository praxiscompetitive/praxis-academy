"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// `match` lets one item own several route prefixes (Learn owns /p, /m, /l and /mission).
export default function NavLink({ href, label, icon, match }: { href: string; label: string; icon: React.ReactNode; match?: string[] }) {
  const path = usePathname();
  const here = href === "/" ? path === "/" || !!match?.some((m) => path.startsWith(m)) : path.startsWith(href);
  return <Link href={href} aria-current={here ? "page" : undefined}>{icon}<span>{label}</span></Link>;
}
