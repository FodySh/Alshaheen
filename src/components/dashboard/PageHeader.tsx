import Link from "next/link";

export function PageHeader({ title, lead, actions }: { title: string; lead?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {lead && <p className="mt-1 text-sm text-ink-soft">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-stone bg-white px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function FilterTabs({ tabs, current }: { tabs: { value: string; label: string; href: string; count?: number }[]; current: string }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-sand-deep">
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          aria-current={t.value === current ? "page" : undefined}
          className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm ${
            t.value === current ? "border-olive font-semibold text-olive-deep" : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className="num ms-1.5 text-xs text-ink-soft">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}
