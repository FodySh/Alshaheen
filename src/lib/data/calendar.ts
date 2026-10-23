import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type CalendarEvent, riyadhMidnightIso, addDays } from "@/lib/calendar";
import { BOOKING_STATUS_LABEL, CONTRACT_STATUS_LABEL } from "@/lib/constants";
import { formatTime, riyadhDayKey } from "@/lib/format";
import type { BookingStatus, ContractStatus } from "@/lib/types";

type BookingRow = {
  id: string;
  ref_no: number;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  listing_id: string;
  listings: { ref_no: number; title: string; district: string } | null;
  visitor: { full_name: string; phone: string } | null;
  agent: { full_name: string } | null;
};

type ListingRow = {
  id: string;
  ref_no: number;
  title: string;
  district: string;
  ad_license_number: string | null;
  ad_license_expiry: string;
  agent: { full_name: string } | null;
};

type ContractRow = {
  id: string;
  ref_no: number;
  district: string;
  status: ContractStatus;
  start_date: string;
  contract_end_date: string | null;
  ejar_contract_number: string | null;
  requester_name: string | null;
  requester_phone: string | null;
  agent: { full_name: string } | null;
};

const OPEN_CONTRACT: ContractStatus[] = ["new", "contacted", "awaiting_data", "sent_to_ejar"];
const LIMIT = 500;

/**
 * أحداث التقويم بين يومين (شاملين).
 * agentId: يقصر الأحداث على وسيط واحد (إلزامي للوسيط، واختياري للمدير). الصلاحيات تُفرض أيضاً في قاعدة البيانات.
 */
export async function getCalendarEvents(
  supabase: SupabaseClient,
  { from, to, agentId, today }: { from: string; to: string; agentId: string | null; today: string },
): Promise<CalendarEvent[]> {
  let bookingsQ = supabase
    .from("bookings")
    .select(
      "id, ref_no, starts_at, ends_at, status, listing_id, listings(ref_no, title, district), visitor:profiles!bookings_visitor_id_fkey(full_name, phone), agent:profiles!bookings_agent_id_fkey(full_name)",
    )
    .neq("status", "cancelled")
    .gte("starts_at", riyadhMidnightIso(from))
    .lt("starts_at", riyadhMidnightIso(addDays(to, 1)))
    .order("starts_at")
    .limit(LIMIT);

  let listingsQ = supabase
    .from("listings")
    .select("id, ref_no, title, district, ad_license_number, ad_license_expiry, agent:profiles!listings_agent_id_fkey(full_name)")
    .eq("status", "published")
    .gte("ad_license_expiry", from)
    .lte("ad_license_expiry", to)
    .limit(LIMIT);

  const contractCols =
    "id, ref_no, district, status, start_date, contract_end_date, ejar_contract_number, requester_name, requester_phone, agent:profiles!contract_requests_assigned_to_fkey(full_name)";
  let endingQ = supabase
    .from("contract_requests")
    .select(contractCols)
    .eq("status", "documented")
    .gte("contract_end_date", from)
    .lte("contract_end_date", to)
    .limit(LIMIT);
  let startingQ = supabase
    .from("contract_requests")
    .select(contractCols)
    .in("status", OPEN_CONTRACT)
    .gte("start_date", from)
    .lte("start_date", to)
    .limit(LIMIT);

  if (agentId) {
    bookingsQ = bookingsQ.eq("agent_id", agentId);
    listingsQ = listingsQ.eq("agent_id", agentId);
    endingQ = endingQ.eq("assigned_to", agentId);
    startingQ = startingQ.eq("assigned_to", agentId);
  }

  const [bk, ls, ending, starting] = await Promise.all([bookingsQ, listingsQ, endingQ, startingQ]);
  for (const r of [bk, ls, ending, starting]) {
    if (r.error) throw new Error(`تعذر تحميل التقويم: ${r.error.message}`);
  }

  const events: CalendarEvent[] = [];

  for (const b of (bk.data ?? []) as unknown as BookingRow[]) {
    const time = formatTime(b.starts_at);
    const done = b.status !== "confirmed";
    events.push({
      id: `b-${b.id}`,
      kind: "viewing",
      day: riyadhDayKey(b.starts_at),
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      label: `${time} ${b.listings?.title ?? "معاينة"}`,
      title: `معاينة: ${b.listings?.title ?? `عرض #${b.listings?.ref_no ?? ""}`}`,
      href: `/dashboard/listings/${b.listing_id}`,
      lines: [
        [b.listings?.district, b.visitor?.full_name ? `الزائر: ${b.visitor.full_name}` : null].filter(Boolean).join(" — "),
      ],
      agent: b.agent?.full_name ?? null,
      phone: b.visitor?.phone ?? null,
      badge: done
        ? { text: BOOKING_STATUS_LABEL[b.status], tone: b.status === "completed" ? "olive" : "muted" }
        : undefined,
    });
  }

  for (const l of (ls.data ?? []) as unknown as ListingRow[]) {
    events.push({
      id: `l-${l.id}`,
      kind: "license",
      day: l.ad_license_expiry,
      label: `ترخيص #${l.ref_no}`,
      title: `آخر يوم لترخيص الإعلان: ${l.title}`,
      href: `/dashboard/listings/${l.id}`,
      lines: [
        `العرض #${l.ref_no} في ${l.district}${l.ad_license_number ? ` — ترخيص ${l.ad_license_number}` : ""}`,
        "يُخفى العرض عن الزوار في اليوم التالي. جدّد الترخيص وحدّث تاريخه.",
      ],
      agent: l.agent?.full_name ?? null,
      badge: l.ad_license_expiry < today ? { text: "منتهي — مخفي عن الزوار", tone: "danger" } : undefined,
    });
  }

  for (const c of (ending.data ?? []) as unknown as ContractRow[]) {
    events.push({
      id: `ce-${c.id}`,
      kind: "contract_end",
      day: c.contract_end_date as string,
      label: `انتهاء عقد #${c.ref_no}`,
      title: `انتهاء عقد إيجار #${c.ref_no} في ${c.district}`,
      href: `/dashboard/contracts/${c.id}`,
      lines: [
        [c.ejar_contract_number ? `عقد إيجار ${c.ejar_contract_number}` : null, c.requester_name].filter(Boolean).join(" — "),
        "تواصل مع المالك والمستأجر للتجديد.",
      ],
      agent: c.agent?.full_name ?? null,
      phone: c.requester_phone,
    });
  }

  for (const c of (starting.data ?? []) as unknown as ContractRow[]) {
    const late = c.start_date < today;
    events.push({
      id: `cs-${c.id}`,
      kind: "contract_start",
      day: c.start_date,
      label: `بداية عقد #${c.ref_no}`,
      title: `بداية عقد #${c.ref_no} في ${c.district} — لم يُوثَّق بعد`,
      href: `/dashboard/contracts/${c.id}`,
      lines: [[c.requester_name, `الحالة: ${CONTRACT_STATUS_LABEL[c.status]}`].filter(Boolean).join(" — ")],
      agent: c.agent?.full_name ?? null,
      phone: c.requester_phone,
      badge: late ? { text: "بدأ ولم يُوثَّق", tone: "danger" } : !c.agent ? { text: "غير مسند", tone: "clay" } : undefined,
    });
  }

  // الترتيب داخل اليوم: المعاينات بوقتها أولاً، ثم المواعيد النهائية
  const order: Record<CalendarEvent["kind"], number> = { viewing: 0, contract_start: 1, license: 2, contract_end: 3 };
  return events.sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      order[a.kind] - order[b.kind] ||
      (a.startsAt ?? "").localeCompare(b.startsAt ?? "") ||
      a.label.localeCompare(b.label, "ar"),
  );
}
