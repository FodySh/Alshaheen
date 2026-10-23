import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isAdmin, requireStaff } from "@/lib/auth";
import { PROPERTY_TYPE_LABEL, PURPOSE_LABEL, REQUEST_STATUS_LABEL, REQUEST_TONE } from "@/lib/constants";
import { daysUntil, formatDay, formatPlainDate, formatShortDate, formatTime, requestClock, riyadhToday } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "نظرة عامة" };

function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: "clay" }) {
  return (
    <Link href={href} className="panel block px-4 py-3 hover:border-stone">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className={`num mt-1 font-display text-3xl font-bold ${tone === "clay" && value > 0 ? "text-clay" : "text-ink"}`}>{value}</p>
    </Link>
  );
}

export default async function DashboardHome() {
  const user = await requireStaff();
  const admin = isAdmin(user);
  const supabase = await createClient();
  const today = riyadhToday();
  const { in7Date: in7, nowIso, weekIso } = requestClock();

  let listingsQ = supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published").gte("ad_license_expiry", today);
  let expiringQ = supabase
    .from("listings")
    .select("id, ref_no, title, ad_license_expiry")
    .eq("status", "published")
    .lte("ad_license_expiry", in7)
    .order("ad_license_expiry");
  if (!admin) {
    listingsQ = listingsQ.eq("agent_id", user.id);
    expiringQ = expiringQ.eq("agent_id", user.id);
  }

  let reqQ = supabase
    .from("marketing_requests")
    .select("id, ref_no, property_type, purpose, district, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(6);
  reqQ = admin ? reqQ.eq("status", "new") : reqQ.in("status", ["under_review", "awaiting_license"]);

  const [live, expiring, reqs, inq, bk] = await Promise.all([
    listingsQ,
    expiringQ,
    reqQ,
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase
      .from("bookings")
      .select("id, starts_at, listing_id, listings(title), profiles!bookings_visitor_id_fkey(full_name, phone)")
      .eq("status", "confirmed")
      .gte("starts_at", nowIso)
      .lte("starts_at", weekIso)
      .order("starts_at")
      .limit(8),
  ]);

  type BRow = { id: string; starts_at: string; listing_id: string; listings: { title: string } | null; profiles: { full_name: string; phone: string } | null };
  const bookings = (bk.data ?? []) as unknown as BRow[];
  const expiringList = (expiring.data ?? []) as { id: string; ref_no: number; title: string; ad_license_expiry: string }[];

  return (
    <div>
      <PageHeader title={`أهلاً ${user.profile.full_name.split(" ")[0] || ""}`} lead={admin ? "ملخص المكتب اليوم" : "ملخص أعمالك اليوم"} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={admin ? "طلبات بانتظار الإسناد" : "طلباتي قيد العمل"} value={reqs.count ?? 0} href="/dashboard/requests" tone="clay" />
        <Stat label="استفسارات بانتظار الرد" value={inq.count ?? 0} href="/dashboard/inquiries?status=new" tone="clay" />
        <Stat label="معاينات هذا الأسبوع" value={bookings.length} href="/dashboard/bookings" />
        <Stat label={admin ? "عروض منشورة" : "عروضي المنشورة"} value={live.count ?? 0} href="/dashboard/listings" />
      </div>

      {expiringList.length > 0 && (
        <section className="mt-6 rounded-lg border border-clay/30 bg-clay-tint/60 p-4" aria-labelledby="exp-h">
          <h2 id="exp-h" className="font-semibold text-clay">تراخيص إعلان تنتهي خلال 7 أيام</h2>
          <p className="mt-1 text-sm text-ink-soft">يُخفى العرض تلقائياً عن الزوار في يوم انتهاء ترخيصه. جدّد الترخيص وحدّث تاريخه.</p>
          <ul className="mt-3 grid gap-1">
            {expiringList.map((l) => {
              const d = daysUntil(l.ad_license_expiry);
              return (
                <li key={l.id}>
                  <Link href={`/dashboard/listings/${l.id}`} className="flex flex-wrap gap-x-3 text-sm hover:underline">
                    <span className="num text-ink-soft" dir="ltr">#{l.ref_no}</span>
                    <span className="font-medium">{l.title}</span>
                    <span className="num text-clay">
                      {d < 0 ? "منتهي — مخفي عن الزوار" : d === 0 ? "ينتهي اليوم" : `ينتهي ${formatPlainDate(l.ad_license_expiry)} (بعد ${d} يوم)`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="panel p-4" aria-labelledby="req-h">
          <div className="flex items-center justify-between">
            <h2 id="req-h" className="font-semibold">{admin ? "طلبات جديدة" : "طلباتي قيد العمل"}</h2>
            <Link href="/dashboard/requests" className="text-sm text-olive-deep hover:underline">كل الطلبات</Link>
          </div>
          {(reqs.data ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">{admin ? "لا توجد طلبات بانتظار الإسناد." : "لا توجد طلبات مسندة إليك قيد العمل."}</p>
          ) : (
            <ul className="mt-3 divide-y divide-sand">
              {(reqs.data ?? []).map((r) => (
                <li key={r.id}>
                  <Link href={`/dashboard/requests/${r.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm hover:underline">
                    <span className="num text-ink-soft" dir="ltr">#{r.ref_no}</span>
                    <span className="font-medium">
                      {PROPERTY_TYPE_LABEL[r.property_type as keyof typeof PROPERTY_TYPE_LABEL]} {PURPOSE_LABEL[r.purpose as "sale"]} — {r.district}
                    </span>
                    <span className="ms-auto flex items-center gap-2">
                      <span className="text-ink-soft">{formatShortDate(r.created_at)}</span>
                      <StatusBadge tone={REQUEST_TONE[r.status as keyof typeof REQUEST_TONE]}>{REQUEST_STATUS_LABEL[r.status as keyof typeof REQUEST_STATUS_LABEL]}</StatusBadge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-4" aria-labelledby="bk-h">
          <div className="flex items-center justify-between">
            <h2 id="bk-h" className="font-semibold">المعاينات القادمة</h2>
            <Link href="/dashboard/bookings" className="text-sm text-olive-deep hover:underline">كل المعاينات</Link>
          </div>
          {bookings.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">لا توجد معاينات خلال 7 أيام. أضف مواعيد متاحة ليحجزها الزوار.</p>
          ) : (
            <ul className="mt-3 divide-y divide-sand">
              {bookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className="font-medium">{formatDay(b.starts_at)}</span>
                  <span className="num">{formatTime(b.starts_at)}</span>
                  <span className="text-ink-soft">{b.listings?.title}</span>
                  <span className="ms-auto">{b.profiles?.full_name} <a className="num text-olive-deep" href={`tel:${b.profiles?.phone}`} dir="ltr">{b.profiles?.phone}</a></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
