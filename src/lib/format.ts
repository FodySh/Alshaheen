import { RENT_PERIOD_LABEL } from "./constants";
import type { RentPeriod } from "./types";

const TZ = "Asia/Riyadh";
const LOCALE = "ar-SA-u-nu-latn-ca-gregory";

const num = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const dec = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

export function formatNumber(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return Number.isInteger(Number(n)) ? num.format(Number(n)) : dec.format(Number(n));
}

export function formatPrice(price: number, rentPeriod?: RentPeriod | null) {
  const base = `${num.format(Number(price))} ريال`;
  return rentPeriod ? `${base} ${RENT_PERIOD_LABEL[rentPeriod]}` : base;
}

export function formatArea(a: number) {
  return `${formatNumber(a)} م²`;
}

const dateFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: "numeric", month: "short" });
const dayFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export const formatDate = (d: string | Date) => dateFmt.format(new Date(d));
export const formatShortDate = (d: string | Date) => shortDateFmt.format(new Date(d));
export const formatDay = (d: string | Date) => dayFmt.format(new Date(d));
export const formatTime = (d: string | Date) => timeFmt.format(new Date(d));
export const formatDateTime = (d: string | Date) => dateTimeFmt.format(new Date(d));

/** تاريخ بدون وقت (YYYY-MM-DD) كما يُخزَّن لتاريخ انتهاء الترخيص */
export function formatPlainDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return dateFmt.format(new Date(Date.UTC(y, m - 1, day, 12)));
}

/** مفتاح اليوم بتوقيت الرياض لتجميع المواعيد */
export function riyadhDayKey(d: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(d),
  );
}

export function riyadhToday() {
  return riyadhDayKey(new Date());
}

/** عدد الأيام المتبقية حتى تاريخ (YYYY-MM-DD) بتوقيت الرياض */
export function daysUntil(plainDate: string) {
  const today = new Date(`${riyadhToday()}T00:00:00Z`).getTime();
  const target = new Date(`${plainDate}T00:00:00Z`).getTime();
  return Math.round((target - today) / 86_400_000);
}

/** يحوّل 05xxxxxxxx إلى 9665xxxxxxxx لروابط واتساب */
export function toInternationalSaudi(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) return `966${digits.slice(1)}`;
  if (digits.startsWith("5") && digits.length === 9) return `966${digits}`;
  return digits;
}

export function whatsappLink(phone: string, text?: string) {
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${toInternationalSaudi(phone)}${q}`;
}

export function ref(prefix: string, n: number) {
  return `${prefix}-${n}`;
}

/** لحظة الطلب الحالية (للصفحات التي تُعرض لكل طلب) */
export function requestClock() {
  const nowMs = Date.now();
  return {
    nowMs,
    nowIso: new Date(nowMs).toISOString(),
    weekIso: new Date(nowMs + 7 * 86_400_000).toISOString(),
    in7Date: riyadhDayKey(new Date(nowMs + 7 * 86_400_000)),
  };
}
