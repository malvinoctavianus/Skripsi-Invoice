"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { NavItem } from "@/lib/navigation";

function getActiveHref(pathname: string, navItems: NavItem[]): string {
  const sorted = [...navItems].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return match?.href ?? "";
}

export function DashboardLayout({ navItems, children }: { navItems: NavItem[]; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const activeHref = getActiveHref(pathname, navItems);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 items-start">
      <aside className="sticky top-[61px] hidden w-56 flex-shrink-0 self-start border-r border-slate-200 bg-white px-3 py-6 sm:block">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
