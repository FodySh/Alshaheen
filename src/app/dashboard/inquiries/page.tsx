import Link from "next/link";
import { InquiryReply } from "@/components/dashboard/InquiryReply";
import { EmptyState, FilterTabs, PageHeader } from "@/components/dashboard/PageHeader";
import { PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { StatusBadge } from "@/components/StatusBadge";
import { requireStaff } from "@/lib/auth";
import { INQUIRY_STATUS_LABEL, INQUIRY_TONE } from "@/lib/constants";
import { formatDateTime, whatsappLink } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Inquiry, InquiryStatus } from "@/lib/types";

export const metadata = { title: "الاستفسارات" };

const TABS: { value: string; label: string; status?: InquiryStatus }[] = [
  { value: "new", label: "بانتظار الرد", status: "new" },
  { value: "replied", label: "تم الرد", status: "replied" },
  { value: "closed", label: "مغلق", status: "closed" },
  { value: "all", label: "الكل" },
];

type Row = Inquiry & {
  listings: { title: string; ref_no: number } | null;
  visitor: { full_name: string; phone: string; email: string | null } | null;
};

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.value === sp.status) ?? TABS[0];
  const supabase = await createClient();
  let q = supabase
    .from("inquiries")
    .select("*, listings(title, ref_no), visitor:profiles!inquiries_user_id_fkey(full_name, phone, email)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (tab.status) q = q.eq("status", tab.status);
  const { data } = await q;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div>
      <PageHeader title="الاستفسارات" lead="استفسارات الزوار على العروض. كل استفسار يصل للوسيط المسؤول عن العرض." />
      <FilterTabs current={tab.value} tabs={TABS.map((t) => ({ value: t.value, label: t.label, href: `/dashboard/inquiries?status=${t.value}` }))} />
      {rows.length === 0 ? (
        <EmptyState title={tab.status === "new" ? "لا توجد استفسارات بانتظار الرد" : "لا توجد استفسارات هنا"} />
      ) : (
        <ul className="grid gap-4">
          {rows.map((q) => (
            <li key={q.id} className="panel p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {q.visitor?.full_name}
                    <span className="num ms-2 text-sm font-normal text-ink-soft" dir="ltr">{q.visitor?.phone}</span>
                  </p>
                  <p className="text-sm text-ink-soft">
                    على العرض{" "}
                    <Link href={`/dashboard/listings/${q.listing_id}`} className="text-olive-deep hover:underline">
                      <span className="num" dir="ltr">#{q.listings?.ref_no}</span> {q.listings?.title}
                    </Link>
                    <span className="ms-2">{formatDateTime(q.created_at)}</span>
                  </p>
                </div>
                <div className="ms-auto flex items-center gap-2">
                  {q.visitor?.phone && (
                    <>
                      <a href={`tel:${q.visitor.phone}`} className="btn btn-quiet btn-sm" aria-label="اتصال"><PhoneIcon /></a>
                      <a href={whatsappLink(q.visitor.phone)} target="_blank" rel="noopener noreferrer" className="btn btn-quiet btn-sm" aria-label="واتساب"><WhatsAppIcon /></a>
                    </>
                  )}
                  <StatusBadge tone={INQUIRY_TONE[q.status]}>{INQUIRY_STATUS_LABEL[q.status]}</StatusBadge>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line rounded-md bg-sand/50 px-3 py-2 text-sm leading-7">{q.message}</p>
              <div className="mt-3">
                <InquiryReply id={q.id} reply={q.reply} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
