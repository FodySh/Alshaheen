import { ComplaintUpdate } from "@/components/dashboard/AdminForms";
import { EmptyState, FilterTabs, PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { COMPLAINT_STATUS_LABEL, COMPLAINT_TONE } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Complaint, ComplaintStatus } from "@/lib/types";

export const metadata = { title: "الشكاوى" };

const TABS: { value: string; label: string; status?: ComplaintStatus }[] = [
  { value: "new", label: "جديدة", status: "new" },
  { value: "in_progress", label: "قيد المعالجة", status: "in_progress" },
  { value: "resolved", label: "تمت المعالجة", status: "resolved" },
  { value: "all", label: "الكل" },
];

export default async function ComplaintsDash({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.value === sp.status) ?? TABS[0];
  const supabase = await createClient();
  let q = supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(200);
  if (tab.status) q = q.eq("status", tab.status);
  const { data } = await q;
  const rows = (data ?? []) as Complaint[];
  return (
    <div>
      <PageHeader title="الشكاوى" lead="لكل شكوى رقم وتاريخ وإجراء متخذ. سجّل الإجراء عند المعالجة." />
      <FilterTabs current={tab.value} tabs={TABS.map((t) => ({ value: t.value, label: t.label, href: `/dashboard/complaints?status=${t.value}` }))} />
      {rows.length === 0 ? (
        <EmptyState title="لا توجد شكاوى هنا" />
      ) : (
        <ul className="grid gap-4">
          {rows.map((c) => (
            <li key={c.id} className="panel p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="num text-sm text-ink-soft" dir="ltr">#{c.ref_no}</span>
                <p className="font-semibold">{c.subject}</p>
                <span className="ms-auto flex items-center gap-3">
                  <span className="text-sm text-ink-soft">{formatDateTime(c.created_at)}</span>
                  <StatusBadge tone={COMPLAINT_TONE[c.status]}>{COMPLAINT_STATUS_LABEL[c.status]}</StatusBadge>
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {c.name} <span className="num ms-2" dir="ltr">{c.phone}</span>
                {c.email && <span className="ms-2" dir="ltr">{c.email}</span>}
                {c.listing_ref && <span className="ms-3">المرجع: {c.listing_ref}</span>}
              </p>
              <p className="mt-3 whitespace-pre-line rounded-md bg-sand/50 px-3 py-2 text-sm leading-7">{c.body}</p>
              <div className="mt-3">
                <ComplaintUpdate id={c.id} status={c.status} response={c.response} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
