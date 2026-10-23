import Link from "next/link";
import { CancelBooking } from "@/components/dashboard/BookingActions";
import { EmptyState, FilterTabs, PageHeader } from "@/components/dashboard/PageHeader";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { StatusBadge } from "@/components/StatusBadge";
import { setBookingOutcome } from "@/lib/actions/staff";
import { isAdmin, requireStaff } from "@/lib/auth";
import { BOOKING_STATUS_LABEL, BOOKING_TONE } from "@/lib/constants";
import { formatDay, formatTime, requestClock, whatsappLink } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";

export const metadata = { title: "المعاينات" };

type Row = Booking & {
  listings: { title: string; ref_no: number; district: string } | null;
  visitor: { full_name: string; phone: string } | null;
  agent: { full_name: string } | null;
};

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const tab = sp.tab === "past" ? "past" : "upcoming";
  const { nowIso, nowMs } = requestClock();
  const supabase = await createClient();
  let q = supabase
    .from("bookings")
    .select(
      "*, listings(title, ref_no, district), visitor:profiles!bookings_visitor_id_fkey(full_name, phone), agent:profiles!bookings_agent_id_fkey(full_name)",
    )
    .limit(150);
  q = tab === "upcoming" ? q.gte("starts_at", nowIso).order("starts_at") : q.lt("starts_at", nowIso).order("starts_at", { ascending: false });
  const { data } = await q;
  const rows = (data ?? []) as unknown as Row[];
  const admin = isAdmin(user);

  return (
    <div>
      <PageHeader
        title="المعاينات"
        lead="حجوزات الزوار من مواعيدك المتاحة."
        actions={<Link href="/dashboard/availability" className="btn btn-secondary">أضف مواعيد متاحة</Link>}
      />
      <FilterTabs
        current={tab}
        tabs={[
          { value: "upcoming", label: "القادمة", href: "/dashboard/bookings" },
          { value: "past", label: "السابقة", href: "/dashboard/bookings?tab=past" },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState title={tab === "upcoming" ? "لا توجد معاينات قادمة" : "لا توجد معاينات سابقة"}>
          {tab === "upcoming" && "تأكد أن لديك مواعيد متاحة ليتمكن الزوار من الحجز."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {rows.map((b) => {
            const started = new Date(b.starts_at).getTime() <= nowMs;
            return (
              <li key={b.id} className="panel flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
                <div className="w-44 shrink-0">
                  <p className="font-semibold">{formatDay(b.starts_at)}</p>
                  <p className="num text-sm text-ink-soft">{formatTime(b.starts_at)} — {formatTime(b.ends_at)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/listings/${b.listing_id}`} className="font-medium hover:underline">
                    <span className="num text-ink-soft" dir="ltr">#{b.listings?.ref_no}</span> {b.listings?.title}
                  </Link>
                  <p className="text-sm text-ink-soft">
                    {b.visitor?.full_name}
                    <span className="num ms-2" dir="ltr">{b.visitor?.phone}</span>
                    {admin && b.agent && <span className="ms-3">الوسيط: {b.agent.full_name}</span>}
                  </p>
                  {b.visitor_note && <p className="mt-1 text-sm">ملاحظة الزائر: {b.visitor_note}</p>}
                  {b.office_note && <p className="mt-1 text-sm text-ink-soft">ملاحظة المكتب: {b.office_note}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {b.visitor?.phone && (
                    <>
                      <a href={`tel:${b.visitor.phone}`} className="btn btn-quiet btn-sm" aria-label="اتصال"><PhoneIcon /></a>
                      <a href={whatsappLink(b.visitor.phone)} target="_blank" rel="noopener noreferrer" className="btn btn-quiet btn-sm" aria-label="واتساب"><WhatsAppIcon /></a>
                    </>
                  )}
                  <StatusBadge tone={BOOKING_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</StatusBadge>
                  {b.status === "confirmed" && started && (
                    <>
                      <form action={setBookingOutcome}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="status" value="completed" />
                        <SubmitButton className="btn btn-secondary btn-sm">تمت</SubmitButton>
                      </form>
                      <form action={setBookingOutcome}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="status" value="no_show" />
                        <SubmitButton className="btn btn-quiet btn-sm">لم يحضر</SubmitButton>
                      </form>
                    </>
                  )}
                  {b.status === "confirmed" && !started && <CancelBooking id={b.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
