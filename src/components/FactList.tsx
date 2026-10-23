/** قائمة مواصفات: الاسم يميناً والقيمة يساراً، بخطوط فاصلة */
export function FactList({ facts }: { facts: [string, string][] }) {
  return (
    <dl className="grid gap-x-10 border-t border-sand-deep sm:grid-cols-2">
      {facts.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 border-b border-sand-deep py-2.5">
          <dt className="text-sm text-ink-soft">{k}</dt>
          <dd className="num text-end font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
