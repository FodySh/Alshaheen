import Link from "next/link";
import { CalendarAgentFilter } from "@/components/dashboard/CalendarAgentFilter";
import { EmptyState, PageHeader } from "@/components/dashboard/PageHeader";
import { ChevronLeftIcon, ChevronRightIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { StatusBadge } from "@/components/StatusBadge";
import { isAdmin, requireStaff } from "@/lib/auth";
import {
  CALENDAR_KINDS,
  CALENDAR_KIND_LABEL,
  CALENDAR_KIND_SHORT,
  CALENDAR_KIND_STYLE,
  type CalendarEvent,
  type CalendarKind,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  formatDayTitle,
  formatMonthTitle,
  monthGrid,
  monthKey,
  parseMonth,
  shiftMonth,
} from "@/lib/calendar";
import { CONTRACT_RENEWAL_DAYS } from "@/lib/constants";
import { getCalendarEvents } from "@/lib/data/calendar";
import { formatTime, riyadhToday, whatsappLink } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "التقويم" };

const MAX_CHIPS = 3;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireStaff();
  const admin = isAdmin(user);
  const sp = await searchParams;
  const today = riyadhToday();
  const thisMonth = today.slice(0, 7);
  const { year, month } = parseMonth(sp.m, today);
  const shown = monthKey(year, month);
  const grid = monthGrid(year, month);
  const hidden = new Set(
    (sp.hide ?? "").split(",").filter((k): k is CalendarKind => (CALENDAR_KINDS as string[]).includes(k)),
  );
  const agentParam = admin && sp.agent && UUID_RE.test(sp.agent) ? sp.agent : "";

  const supabase = await createClient();
  const [all, agentsRes] = await Promise.all([
    getCalendarEvents(supabase, { from: grid.start, to: grid.end, agentId: admin ? agentParam || null : user.id, today }),
    admin
      ? supabase.from("profiles").select("id, full_name").in("role", ["agent", "admin"]).eq("is_active", true).order("full_name")
      : Promise.resolve({ data: [] }),
  ]);
  const agents = (agentsRes.data ?? []) as { id: string; full_name: string }[];

  const href = (o: { m?: string; hide?: Set<CalendarKind>; agent?: string } = {}) => {
    const m = o.m ?? shown;
    const h = [...(o.hide ?? hidden)];
    const a = o.agent ?? agentParam;
    const p = new URLSearchParams();
    if (m !== thisMonth) p.set("m", m);
    if (h.length) p.set("hide", h.join(","));
    if (a) p.set("agent", a);
    const s = p.toString();
    return `/dashboard/calendar${s ? `?${s}` : ""}`;
  };
  const toggle = (k: CalendarKind) => {
    const next = new Set(hidden);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return href({ hide: next });
  };

  const inMonth = (day: string) => day >= grid.first && day <= grid.last;
  const counts = Object.fromEntries(CALENDAR_KINDS.map((k) => [k, 0])) as Record<CalendarKind, number>;
  for (const e of all) if (inMonth(e.day)) counts[e.kind]++;

  const events = all.filter((e) => !hidden.has(e.kind));
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const list = byDay.get(e.day);
    if (list) list.push(e);
    else byDay.set(e.day, [e]);
  }

  const monthDays = [...byDay.keys()].filter(inMonth).sort();
  const isCurrent = shown === thisMonth;
  const upcomingDays = isCurrent ? monthDays.filter((d) => d >= today) : monthDays;
  const pastDays = isCurrent ? monthDays.filter((d) => d < today) : [];

  return (
    <div>
      <PageHeader
        title="التقويم"
        lead={
          admin
            ? "مواعيد المكتب: المعاينات، وتراخيص الإعلانات، وعقود الإيجار."
            : "مواعيدك: معايناتك، وتراخيص عروضك، والعقود المسندة إليك."
        }
      />

      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Link href={href({ m: shiftMonth(year, month, -1) })} className="btn btn-quiet btn-sm" aria-label="الشهر السابق">
              <ChevronRightIcon className="size-5" />
            </Link>
            <h2 className="min-w-36 text-center font-display text-xl font-bold" aria-live="polite">
              {formatMonthTitle(year, month)}
            </h2>
            <Link href={href({ m: shiftMonth(year, month, 1) })} className="btn btn-quiet btn-sm" aria-label="الشهر التالي">
              <ChevronLeftIcon className="size-5" />
            </Link>
          </div>
          {!isCurrent && (
            <Link href={href({ m: thisMonth })} className="btn btn-secondary btn-sm">
              الشهر الحالي
            </Link>
          )}
          {admin && (
            <div className="ms-auto">
              <CalendarAgentFilter agents={agents} current={agentParam} month={shown} hide={[...hidden].join(",")} />
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2" aria-label="أنواع المواعيد">
          {CALENDAR_KINDS.map((k) => {
            const off = hidden.has(k);
            return (
              <Link
                key={k}
                href={toggle(k)}
                title={off ? "إظهار" : "إخفاء"}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                  off ? "border-sand-deep text-ink-soft line-through decoration-stone" : "border-stone bg-white text-ink"
                }`}
              >
                <span className={`size-2.5 rounded-full ${off ? "bg-sand-deep" : CALENDAR_KIND_STYLE[k].dot}`} aria-hidden />
                {CALENDAR_KIND_LABEL[k]}
                <span className="num text-xs text-ink-soft">{counts[k]}</span>
                {off && <span className="sr-only">(مخفي)</span>}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 overflow-hidden rounded-md border border-sand-deep">
          <div className="grid grid-cols-7 bg-sand/60 text-center text-xs font-semibold text-ink-soft">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className="py-2">
                <span className="hidden sm:inline">{w}</span>
                <span className="sm:hidden" aria-hidden>{WEEKDAYS_SHORT[i]}</span>
              </div>
            ))}
          </div>
          {grid.weeks.map((week) => (
            <div key={week[0]} className="grid grid-cols-7 border-t border-sand-deep">
              {week.map((day, i) => {
                const list = byDay.get(day) ?? [];
                const own = inMonth(day);
                const isToday = day === today;
                const weekend = i >= 5;
                const anchor = own ? `#d-${day}` : `${href({ m: day.slice(0, 7) })}#d-${day}`;
                const kinds = [...new Set(list.map((e) => e.kind))];
                const num = (
                  <span
                    className={`num inline-flex size-7 items-center justify-center rounded-full text-sm ${
                      isToday ? "bg-olive font-bold text-white" : own ? "text-ink" : "text-stone"
                    }`}
                  >
                    {Number(day.slice(8))}
                  </span>
                );
                return (
                  <div
                    key={day}
                    className={`min-h-16 border-s border-sand-deep p-1 first:border-s-0 md:min-h-28 md:p-1.5 ${
                      !own ? "bg-sand/25" : weekend ? "bg-paper" : "bg-white"
                    }`}
                  >
                    {/* الجوال: رقم اليوم ونقاط الأنواع */}
                    {list.length ? (
                      <a
                        href={anchor}
                        aria-label={`${formatDayTitle(day)}: ${list.length} ${list.length === 1 ? "موعد" : "مواعيد"}`}
                        className="flex flex-col items-center gap-1 rounded py-0.5 md:hidden"
                      >
                        {num}
                        <span className="flex items-center gap-0.5">
                          {kinds.map((k) => (
                            <span key={k} className={`size-1.5 rounded-full ${CALENDAR_KIND_STYLE[k].dot}`} aria-hidden />
                          ))}
                          {list.length > 1 && <span className="num text-[10px] leading-none text-ink-soft">{list.length}</span>}
                        </span>
                      </a>
                    ) : (
                      <div className="flex justify-center py-0.5 md:hidden">{num}</div>
                    )}

                    {/* الحاسب: شرائح الأحداث */}
                    <div className="hidden md:block">
                      {num}
                      {list.length > 0 && (
                        <ul className="mt-1 grid grid-cols-1 gap-0.5">
                          {list.slice(0, MAX_CHIPS).map((e) => (
                            <li key={e.id}>
                              <Link
                                href={e.href}
                                title={e.title}
                                className={`block truncate rounded px-1.5 py-0.5 text-xs font-medium hover:brightness-95 ${CALENDAR_KIND_STYLE[e.kind].chip} ${
                                  e.badge?.tone === "danger" ? "ring-1 ring-danger/40" : ""
                                }`}
                              >
                                {e.label}
                              </Link>
                            </li>
                          ))}
                          {list.length > MAX_CHIPS && (
                            <li>
                              <a href={anchor} className="block px-1.5 text-xs text-ink-soft hover:underline">
                                +{list.length - MAX_CHIPS} أخرى
                              </a>
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-semibold">{isCurrent ? "القادم هذا الشهر" : `مواعيد ${formatMonthTitle(year, month)}`}</h2>
        {upcomingDays.length === 0 ? (
          <EmptyState title={isCurrent ? "لا توجد مواعيد قادمة هذا الشهر" : "لا توجد مواعيد في هذا الشهر"}>
            {hidden.size > 0 ? "بعض أنواع المواعيد مخفية. اضغط عليها أعلاه لإظهارها." : null}
          </EmptyState>
        ) : (
          <div className="grid gap-5">
            {upcomingDays.map((d) => (
              <DaySection key={d} day={d} today={today} events={byDay.get(d) ?? []} admin={admin} />
            ))}
          </div>
        )}

        {pastDays.length > 0 && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-semibold text-ink-soft">
              أيام سابقة من الشهر (<span className="num">{pastDays.length}</span>)
            </summary>
            <div className="mt-3 grid gap-5 opacity-80">
              {[...pastDays].reverse().map((d) => (
                <DaySection key={d} day={d} today={today} events={byDay.get(d) ?? []} admin={admin} />
              ))}
            </div>
          </details>
        )}

        <p className="mt-6 text-sm text-ink-soft">
          يصل تنبيه تجديد العقد بالبريد للوسيط والمالك تلقائياً قبل <span className="num">{CONTRACT_RENEWAL_DAYS}</span> يوماً من انتهائه.
        </p>
      </div>
    </div>
  );
}

function DaySection({ day, today, events, admin }: { day: string; today: string; events: CalendarEvent[]; admin: boolean }) {
  return (
    <section id={`d-${day}`} className="scroll-mt-4" aria-labelledby={`h-${day}`}>
      <h3 id={`h-${day}`} className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {formatDayTitle(day)}
        {day === today && <StatusBadge tone="olive">اليوم</StatusBadge>}
      </h3>
      <ul className="panel divide-y divide-sand">
        {events.map((e) => (
          <li key={e.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3">
            <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${CALENDAR_KIND_STYLE[e.kind].dot}`} aria-hidden />
            <span className="num shrink-0 whitespace-nowrap text-sm text-ink-soft sm:w-32">
              {e.startsAt ? `${formatTime(e.startsAt)}${e.endsAt ? ` – ${formatTime(e.endsAt)}` : ""}` : CALENDAR_KIND_SHORT[e.kind]}
            </span>
            <div className="min-w-0 flex-1 basis-56">
              <Link href={e.href} className="font-medium hover:underline">
                {e.title}
              </Link>
              {e.lines.filter(Boolean).map((l) => (
                <p key={l} className="text-sm text-ink-soft">{l}</p>
              ))}
              {admin && e.agent && <p className="text-sm text-ink-soft">الوسيط: {e.agent}</p>}
            </div>
            <div className="flex items-center gap-2">
              {e.badge && <StatusBadge tone={e.badge.tone}>{e.badge.text}</StatusBadge>}
              {e.phone && (
                <>
                  <a href={`tel:${e.phone}`} className="btn btn-quiet btn-sm" aria-label={`اتصال ${e.phone}`}>
                    <PhoneIcon />
                  </a>
                  <a
                    href={whatsappLink(e.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-quiet btn-sm"
                    aria-label="واتساب"
                  >
                    <WhatsAppIcon />
                  </a>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
