import Link from "next/link";
import { EmptyState, FilterTabs, PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isAdmin, requireStaff } from "@/lib/auth";
import { CONTRACT_KIND_LABEL, CONTRACT_PARTY_LABEL, CONTRACT_RENEWAL_DAYS, CONTRACT_STATUS_LABEL, CONTRACT_TONE } from "@/lib/constants";
import { daysUntil, formatPlainDate, formatPrice, formatShortDate, riyadhDayKey, requestClock } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ContractRequest, ContractStatus } from "@/lib/types";

export const metadata = { title: "عقود الإيجار" };

const TABS: { value: string; label: string; statuses?: ContractStatus[] }[] = [
  { value: "open", label: "قيد العمل", statuses: ["new", "contacted", "awaiting_data", "sent_to_ejar"] },
  { value: "new", label: "جديد", statuses: ["new"] },
  { value: "renewal", label: "تنتهي قريباً", statuses: ["documented"] },
  { value: "documented", label: "موثّق", statuses: ["documented"] },
  { value: "cancelled", label: "ملغى", statuses: ["cancelled"] },
  { value: "all", label: "الكل" },
];

type Row = Pick<ContractRequest, "id" | "ref_no" | "requester_role" | "requester_name" | "requester_phone" | "submitter_id" | "contract_kind" | "is_renewal" | "district" | "annual_rent" | "status" | "contract_end_date" | "created_at"> & {
  submitter: { full_name: string; phone: string } | null;
  agent: { full_name: string } | null;
};

export default async function ContractsDash({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.value === sp.tab) ?? TABS[0];
  const supabase = await createClient();
  const { nowMs } = requestClock();
  const horizon = riyadhDayKey(new Date(nowMs + CONTRACT_RENEWAL_DAYS * 86_400_000));

  let q = supabase
    .from("contract_requests")
    .select(
      "id, ref_no, requester_role, requester_name, requester_phone, submitter_id, contract_kind, is_renewal, district, annual_rent, status, contract_end_date, created_at, submitter:profiles!contract_requests_submitter_id_fkey(full_name, phone), agent:profiles!contract_requests_assigned_to_fkey(full_name)",
    )
    .limit(300);
  if (tab.statuses) q = q.in("status", tab.statuses);
  if (tab.value === "renewal") q = q.lte("contract_end_date", horizon).order("contract_end_date");
  else if (tab.value === "documented") q = q.order("contract_end_date");
  else q = q.order("created_at", { ascending: false });
  const { data } = await q;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div>
      <PageHeader
        title="عقود الإيجار"
        lead={isAdmin(user) ? "طلبات توثيق العقود في منصة إيجار. أسند كل طلب جديد لوسيط." : "طلبات التوثيق المسندة إليك."}
      />
      <FilterTabs current={tab.value} tabs={TABS.map((t) => ({ value: t.value, label: t.label, href: `/dashboard/contracts?tab=${t.value}` }))} />
      {rows.length === 0 ? (
        <EmptyState title={tab.value === "renewal" ? `لا توجد عقود تنتهي خلال ${CONTRACT_RENEWAL_DAYS} يوماً` : "لا توجد طلبات هنا"} />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم</th>
                <th>العقد</th>
                <th>مقدم الطلب</th>
                <th>الإيجار السنوي</th>
                <th>المسؤول</th>
                <th>{tab.value === "renewal" || tab.value === "documented" ? "ينتهي" : "التاريخ"}</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const d = c.contract_end_date ? daysUntil(c.contract_end_date) : null;
                return (
                  <tr key={c.id}>
                    <td className="num">
                      <Link href={`/dashboard/contracts/${c.id}`} className="font-semibold text-olive-deep hover:underline" dir="ltr">#{c.ref_no}</Link>
                    </td>
                    <td>
                      <Link href={`/dashboard/contracts/${c.id}`} className="hover:underline">
                        {CONTRACT_KIND_LABEL[c.contract_kind]}{c.is_renewal ? " (تجديد)" : ""}
                        <span className="block text-xs text-ink-soft">{c.district}</span>
                      </Link>
                    </td>
                    <td>
                      {c.requester_name ?? c.submitter?.full_name}
                      <span className="block text-xs text-ink-soft">
                        {CONTRACT_PARTY_LABEL[c.requester_role]}
                        {!c.submitter_id && " — بدون حساب"}
                      </span>
                    </td>
                    <td className="num whitespace-nowrap">{formatPrice(c.annual_rent)}</td>
                    <td className="text-sm">{c.agent?.full_name ?? <span className="text-clay">غير مسند</span>}</td>
                    <td className="whitespace-nowrap text-sm">
                      {(tab.value === "renewal" || tab.value === "documented") && c.contract_end_date ? (
                        <span className={d !== null && d <= CONTRACT_RENEWAL_DAYS ? "font-semibold text-clay" : "text-ink-soft"}>
                          {formatPlainDate(c.contract_end_date)}
                          {d !== null && d >= 0 && d <= CONTRACT_RENEWAL_DAYS && <span className="block text-xs">بعد {d} يوم</span>}
                          {d !== null && d < 0 && <span className="block text-xs">انتهى</span>}
                        </span>
                      ) : (
                        <span className="text-ink-soft">{formatShortDate(c.created_at)}</span>
                      )}
                    </td>
                    <td><StatusBadge tone={CONTRACT_TONE[c.status]}>{CONTRACT_STATUS_LABEL[c.status]}</StatusBadge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
