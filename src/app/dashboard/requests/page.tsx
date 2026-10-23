import Link from "next/link";
import { EmptyState, FilterTabs, PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isAdmin, requireStaff } from "@/lib/auth";
import { PROPERTY_TYPE_LABEL, PURPOSE_LABEL, REQUEST_STATUS_LABEL, REQUEST_TONE } from "@/lib/constants";
import { formatPrice, formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { MarketingRequest, RequestStatus } from "@/lib/types";

export const metadata = { title: "طلبات التسويق" };

const TABS: { value: string; label: string; statuses?: RequestStatus[] }[] = [
  { value: "open", label: "قيد العمل", statuses: ["new", "under_review", "awaiting_license"] },
  { value: "new", label: "جديد", statuses: ["new"] },
  { value: "awaiting_license", label: "بانتظار الترخيص", statuses: ["awaiting_license"] },
  { value: "published", label: "منشور", statuses: ["published"] },
  { value: "done", label: "مغلق أو مرفوض", statuses: ["closed", "rejected"] },
  { value: "all", label: "الكل" },
];

type Row = Pick<MarketingRequest, "id" | "ref_no" | "property_type" | "purpose" | "district" | "asking_price" | "rent_period" | "status" | "created_at" | "assigned_to"> & {
  submitter: { full_name: string; phone: string } | null;
  agent: { full_name: string } | null;
};

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.value === sp.tab) ?? TABS[0];
  const supabase = await createClient();

  let q = supabase
    .from("marketing_requests")
    .select(
      "id, ref_no, property_type, purpose, district, asking_price, rent_period, status, created_at, assigned_to, submitter:profiles!marketing_requests_submitter_id_fkey(full_name, phone), agent:profiles!marketing_requests_assigned_to_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (tab.statuses) q = q.in("status", tab.statuses);
  const { data, error } = await q;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div>
      <PageHeader
        title="طلبات التسويق"
        lead={isAdmin(user) ? "كل الطلبات الواردة من الملاك والوكلاء. أسند كل طلب جديد لوسيط." : "الطلبات المسندة إليك."}
      />
      <FilterTabs current={tab.value} tabs={TABS.map((t) => ({ value: t.value, label: t.label, href: `/dashboard/requests?tab=${t.value}` }))} />
      {error && <p className="text-sm text-danger">تعذّر تحميل الطلبات.</p>}
      {rows.length === 0 ? (
        <EmptyState title="لا توجد طلبات في هذا التصنيف" />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم</th>
                <th>العقار</th>
                <th>السعر المطلوب</th>
                <th>مقدم الطلب</th>
                <th>المسؤول</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="num">
                    <Link href={`/dashboard/requests/${r.id}`} className="font-semibold text-olive-deep hover:underline" dir="ltr">#{r.ref_no}</Link>
                  </td>
                  <td>
                    <Link href={`/dashboard/requests/${r.id}`} className="hover:underline">
                      {PROPERTY_TYPE_LABEL[r.property_type]} {PURPOSE_LABEL[r.purpose]}
                      <span className="block text-xs text-ink-soft">{r.district}</span>
                    </Link>
                  </td>
                  <td className="num whitespace-nowrap">{formatPrice(r.asking_price, r.rent_period)}</td>
                  <td>
                    {r.submitter?.full_name}
                    <span className="num block text-xs text-ink-soft" dir="ltr" style={{ textAlign: "right" }}>{r.submitter?.phone}</span>
                  </td>
                  <td className="text-sm">{r.agent?.full_name ?? <span className="text-clay">غير مسند</span>}</td>
                  <td><StatusBadge tone={REQUEST_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</StatusBadge></td>
                  <td className="whitespace-nowrap text-sm text-ink-soft">{formatShortDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
