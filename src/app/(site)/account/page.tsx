import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CancelBookingButton } from "@/components/account/CancelBookingButton";
import { ProfileForm } from "@/components/account/ProfileForm";
import { StatusBadge } from "@/components/StatusBadge";
import { isStaff, requireUser } from "@/lib/auth";
import {
  CONTRACT_KIND_LABEL,
  CONTRACT_STATUS_LABEL,
  CONTRACT_TONE,
  BOOKING_STATUS_LABEL,
  BOOKING_TONE,
  COMPLAINT_STATUS_LABEL,
  COMPLAINT_TONE,
  INQUIRY_STATUS_LABEL,
  INQUIRY_TONE,
  PROPERTY_TYPE_LABEL,
  PURPOSE_LABEL,
  REQUEST_STATUS_LABEL,
  REQUEST_TONE,
} from "@/lib/constants";
import { formatDate, formatDay, formatTime, requestClock } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Booking, Complaint, ContractRequest, Inquiry, MarketingRequest } from "@/lib/types";

export const metadata: Metadata = { title: "حسابي" };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-sand/50" />}>
        <Account />
      </Suspense>
    </div>
  );
}

function Block({ id, title, action, children }: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24" aria-labelledby={`${id}-h`}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={`${id}-h`} className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-stone bg-white px-4 py-6 text-center text-sm text-ink-soft">{children}</p>;
}

async function Account() {
  const user = await requireUser("/account");
  const supabase = await createClient();
  const [req, inq, bk, cmp, ctr] = await Promise.all([
    supabase
      .from("marketing_requests")
      .select("id, ref_no, property_type, purpose, district, status, created_at")
      .eq("submitter_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("inquiries")
      .select("id, ref_no, listing_id, message, status, reply, replied_at, created_at, listings(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("bookings")
      .select("id, ref_no, listing_id, starts_at, status, office_note, listings(title, district)")
      .eq("visitor_id", user.id)
      .order("starts_at", { ascending: false })
      .limit(30),
    supabase
      .from("complaints")
      .select("id, ref_no, subject, status, response, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("contract_requests")
      .select("id, ref_no, contract_kind, is_renewal, district, status, contract_end_date, created_at")
      .eq("submitter_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const contracts = (ctr.data ?? []) as Pick<ContractRequest, "id" | "ref_no" | "contract_kind" | "is_renewal" | "district" | "status" | "contract_end_date" | "created_at">[];

  const requests = (req.data ?? []) as Pick<MarketingRequest, "id" | "ref_no" | "property_type" | "purpose" | "district" | "status" | "created_at">[];
  const inquiries = (inq.data ?? []) as unknown as (Inquiry & { listings: { title: string } | null })[];
  const bookings = (bk.data ?? []) as unknown as (Booking & { listings: { title: string; district: string } | null })[];
  const complaints = (cmp.data ?? []) as Complaint[];
  const now = requestClock().nowMs;

  return (
    <div className="grid gap-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">حسابي</h1>
          <p className="mt-1 text-ink-soft">أهلاً {user.profile.full_name || "بك"}</p>
        </div>
        <div className="flex gap-2">
          {isStaff(user) && <Link href="/dashboard" className="btn btn-secondary btn-sm">لوحة المكتب</Link>}
          <form action="/auth/signout" method="post">
            <button className="btn btn-quiet btn-sm" type="submit">تسجيل الخروج</button>
          </form>
        </div>
      </header>

      <Block id="requests" title="طلبات التسويق" action={<Link href="/submit" className="btn btn-primary btn-sm">طلب جديد</Link>}>
        {requests.length === 0 ? (
          <Empty>لم تقدم أي طلب بعد. اعرض عقارك علينا وتابع حالته من هنا.</Empty>
        ) : (
          <ul className="panel divide-y divide-sand">
            {requests.map((r) => (
              <li key={r.id}>
                <Link href={`/account/requests/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-[#fdfcf9]">
                  <span className="num text-sm text-ink-soft" dir="ltr">#{r.ref_no}</span>
                  <span className="font-medium">
                    {PROPERTY_TYPE_LABEL[r.property_type]} {PURPOSE_LABEL[r.purpose]} في {r.district}
                  </span>
                  <span className="ms-auto flex items-center gap-3">
                    <span className="text-sm text-ink-soft">{formatDate(r.created_at)}</span>
                    <StatusBadge tone={REQUEST_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</StatusBadge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block id="contracts" title="توثيق عقود الإيجار" action={<Link href="/contracts" className="btn btn-secondary btn-sm">طلب توثيق</Link>}>
        {contracts.length === 0 ? (
          <Empty>لا توجد طلبات توثيق. نوثّق عقدك في منصة إيجار سواء كنت المالك أو المستأجر.</Empty>
        ) : (
          <ul className="panel divide-y divide-sand">
            {contracts.map((c) => (
              <li key={c.id}>
                <Link href={`/account/contracts/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-[#fdfcf9]">
                  <span className="num text-sm text-ink-soft" dir="ltr">#{c.ref_no}</span>
                  <span className="font-medium">
                    عقد {CONTRACT_KIND_LABEL[c.contract_kind]}{c.is_renewal ? " (تجديد)" : ""} في {c.district}
                  </span>
                  <span className="ms-auto flex items-center gap-3">
                    <span className="text-sm text-ink-soft">{formatDate(c.created_at)}</span>
                    <StatusBadge tone={CONTRACT_TONE[c.status]}>{CONTRACT_STATUS_LABEL[c.status]}</StatusBadge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block id="bookings" title="مواعيد المعاينة">
        {bookings.length === 0 ? (
          <Empty>لا توجد مواعيد. احجز معاينة من صفحة أي عرض.</Empty>
        ) : (
          <ul className="panel divide-y divide-sand">
            {bookings.map((b) => {
              const upcoming = b.status === "confirmed" && new Date(b.starts_at).getTime() > now;
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{formatDay(b.starts_at)} — <span className="num">{formatTime(b.starts_at)}</span></p>
                    <p className="text-sm text-ink-soft">
                      {b.listings ? (
                        <Link href={`/listings/${b.listing_id}`} className="hover:underline">{b.listings.title}</Link>
                      ) : (
                        "العرض لم يعد منشوراً"
                      )}
                    </p>
                    {b.office_note && b.status === "cancelled" && <p className="mt-1 text-sm text-clay">ملاحظة المكتب: {b.office_note}</p>}
                  </div>
                  <div className="ms-auto flex items-center gap-3">
                    <StatusBadge tone={BOOKING_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</StatusBadge>
                    {upcoming && <CancelBookingButton bookingId={b.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Block>

      <Block id="inquiries" title="استفساراتي">
        {inquiries.length === 0 ? (
          <Empty>لم ترسل أي استفسار بعد.</Empty>
        ) : (
          <ul className="grid gap-3">
            {inquiries.map((q) => (
              <li key={q.id} className="panel p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-medium">
                    {q.listings ? <Link href={`/listings/${q.listing_id}`} className="hover:underline">{q.listings.title}</Link> : "العرض لم يعد منشوراً"}
                  </p>
                  <span className="ms-auto flex items-center gap-3">
                    <span className="text-sm text-ink-soft">{formatDate(q.created_at)}</span>
                    <StatusBadge tone={INQUIRY_TONE[q.status]}>{INQUIRY_STATUS_LABEL[q.status]}</StatusBadge>
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-7">{q.message}</p>
                {q.reply && (
                  <div className="mt-3 rounded-md border-s-2 border-olive bg-olive-tint/50 px-3 py-2">
                    <p className="text-xs font-semibold text-olive-deep">رد المكتب</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-7">{q.reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Block>

      {complaints.length > 0 && (
        <Block id="complaints" title="شكاواي">
          <ul className="grid gap-3">
            {complaints.map((c) => (
              <li key={c.id} className="panel p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="num text-sm text-ink-soft" dir="ltr">#{c.ref_no}</span>
                  <p className="font-medium">{c.subject}</p>
                  <span className="ms-auto">
                    <StatusBadge tone={COMPLAINT_TONE[c.status]}>{COMPLAINT_STATUS_LABEL[c.status]}</StatusBadge>
                  </span>
                </div>
                {c.response && <p className="mt-2 text-sm leading-7 text-ink-soft">الرد: {c.response}</p>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block id="profile" title="بياناتي">
        <div className="panel p-5">
          <ProfileForm fullName={user.profile.full_name} phone={user.profile.phone} email={user.email} />
        </div>
      </Block>
    </div>
  );
}
