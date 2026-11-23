"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/properties", label: "Properties", path: "M4 20V6l8-3 8 3v14M2 20h20M8 9h2m4 0h2m-8 4h2m4 0h2m-5 7v-4h2v4" },
  { href: "/home-services", label: "Services", path: "M14 6a5 5 0 0 0-6 6L3 17l4 4 5-5a5 5 0 0 0 6-6l-3 3-3-3 2-4Z" },
  { href: "/matches", label: "Matches", path: "M4 5h16v14H4zM8 9h8M8 13h5M15 16l2 2 4-4" },
  { href: "/loans", label: "Loans", path: "M3 9 12 4l9 5M5 10v8m5-8v8m4-8v8m5-8v8M3 20h18" },
  { href: "/account", label: "Account", path: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0" },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const isHomeSection = pathname === "/" || pathname === "/events" || pathname === "/health-checkup";
  if (!isHomeSection && !links.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`))) return null;

  return <>
    <div aria-hidden="true" className="h-[calc(4.5rem+env(safe-area-inset-bottom))] shrink-0 sm:hidden" />
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.08)] sm:hidden">
      <div className="mx-auto flex h-[4.5rem] max-w-lg items-stretch justify-around px-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {links.map(({ href, label, path }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} aria-current={current ? "page" : undefined} className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold sm:text-xs ${current ? "text-[#A71930]" : "text-[#A71930]"}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d={path} /></svg>
            <span>{label}</span>
          </Link>;
        })}
      </div>
    </nav>
  </>;
}
