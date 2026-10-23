/** أدوات التقويم: تواريخ بصيغة YYYY-MM-DD بتوقيت الرياض (UTC+3 بلا توقيت صيفي) */
import type { Tone } from "./constants";

export type CalendarKind = "viewing" | "license" | "contract_end" | "contract_start";

export const CALENDAR_KINDS: CalendarKind[] = ["viewing", "license", "contract_end", "contract_start"];

export const CALENDAR_KIND_LABEL: Record<CalendarKind, string> = {
  viewing: "معاينات",
  license: "انتهاء تراخيص الإعلان",
  contract_end: "انتهاء عقود الإيجار",
  contract_start: "بداية عقود لم تُوثَّق",
};

/** وصف قصير يظهر بجانب الحدث في القائمة (المعاينات تُعرض بوقتها) */
export const CALENDAR_KIND_SHORT: Record<CalendarKind, string> = {
  viewing: "معاينة",
  license: "ترخيص إعلان",
  contract_end: "انتهاء عقد",
  contract_start: "بداية عقد",
};

/** ألوان كل نوع: نقطة، وشريحة داخل اليوم */
export const CALENDAR_KIND_STYLE: Record<CalendarKind, { dot: string; chip: string }> = {
  viewing: { dot: "bg-olive", chip: "bg-olive-tint text-olive-deep" },
  license: { dot: "bg-sea", chip: "bg-sea-tint text-sea" },
  contract_end: { dot: "bg-clay", chip: "bg-clay-tint text-clay" },
  contract_start: { dot: "bg-ink-soft", chip: "bg-sand text-ink" },
};

export type CalendarEvent = {
  id: string;
  kind: CalendarKind;
  /** اليوم بتوقيت الرياض */
  day: string;
  /** وقت البداية والنهاية (للمعاينات فقط) */
  startsAt?: string;
  endsAt?: string;
  /** نص قصير للشريحة داخل الشبكة */
  label: string;
  title: string;
  href: string;
  lines: string[];
  agent: string | null;
  phone?: string | null;
  badge?: { text: string; tone: Tone };
};

export const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const WEEKDAYS_SHORT = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(day: string) {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

/** الشهر المطلوب من الرابط (YYYY-MM)، أو شهر اليوم */
export function parseMonth(value: string | undefined, today: string) {
  const m = value?.match(MONTH_RE);
  const year = m ? Number(m[1]) : Number(today.slice(0, 4));
  const month = m ? Number(m[2]) : Number(today.slice(5, 7));
  if (year < 2020 || year > 2100) return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  return { year, month };
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

/** أسابيع الشهر كاملة (من الأحد إلى السبت) مع أيام الشهرين المجاورين */
export function monthGrid(year: number, month: number) {
  const first = `${monthKey(year, month)}-01`;
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = `${monthKey(year, month)}-${String(lastDate).padStart(2, "0")}`;
  const start = addDays(first, -weekday(first));
  const end = addDays(last, 6 - weekday(last));
  const weeks: string[][] = [];
  for (let d = start; d <= end; d = addDays(d, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  }
  return { first, last, start, end, weeks };
}

/** بداية اليوم بتوقيت الرياض كلحظة زمنية */
export function riyadhMidnightIso(day: string) {
  return `${day}T00:00:00+03:00`;
}

const monthTitleFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { month: "long", year: "numeric", timeZone: "UTC" });
const dayTitleFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export const formatMonthTitle = (year: number, month: number) => monthTitleFmt.format(new Date(Date.UTC(year, month - 1, 1)));
export const formatDayTitle = (day: string) => dayTitleFmt.format(new Date(`${day}T12:00:00Z`));
