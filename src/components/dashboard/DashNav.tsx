"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; count?: number };

export function DashNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="لوحة المكتب" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map((it) => {
        const active = it.href === "/dashboard" ? path === "/dashboard" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-[0.95rem] ${
              active ? "bg-olive text-white" : "text-ink hover:bg-sand"
            }`}
          >
            <span>{it.label}</span>
            {!!it.count && (
              <span className={`num rounded px-1.5 text-xs font-semibold ${active ? "bg-white/20" : "bg-clay-tint text-clay"}`}>{it.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
