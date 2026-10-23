export function AuthShell({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      {lead && <p className="mt-2 leading-7 text-ink-soft">{lead}</p>}
      <div className="panel mt-6 p-6">{children}</div>
    </div>
  );
}
