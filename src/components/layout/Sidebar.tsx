"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/auth";

const NAV: { href: string; label: string; roles?: AppRole[] }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/loads", label: "Loads" },
  { href: "/crm", label: "CRM" },
  { href: "/carriers", label: "Carriers" },
  { href: "/quotes", label: "Quotes" },
  { href: "/loadboard", label: "Load Board" },
  { href: "/tracking", label: "Tracking" },
  { href: "/agents", label: "Agent Performance" },
  { href: "/financials", label: "Financials", roles: ["ADMIN"] },
  { href: "/analytics", label: "Analytics" },
  { href: "/admin/users", label: "Users", roles: ["ADMIN"] },
];

export function Sidebar({
  role,
  name,
  email,
}: {
  role: AppRole;
  name: string;
  email: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-5">
        <Link href="/dashboard" className="text-lg font-bold text-slate-900">
          Freight Society
        </Link>
        <p className="text-xs text-slate-400">TMS / CRM</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 px-5 py-4">
        <p className="truncate text-sm font-medium text-slate-800">{name}</p>
        <p className="truncate text-xs text-slate-400">{email}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
          {role}
        </p>
        <form action="/api/auth/signout" method="POST" className="mt-3">
          <SignOutButton />
        </form>
      </div>
    </aside>
  );
}

function SignOutButton() {
  return (
    <a
      href="/logout"
      className="block w-full rounded-lg border border-slate-200 px-3 py-1.5 text-center text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      Sign out
    </a>
  );
}
