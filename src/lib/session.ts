/**
 * سياسة الجلسات. دوال صافية بلا اعتماد على Next أو Supabase حتى تُختبر مباشرة،
 * ويستخدمها الـ proxy وطبقة الدخول على الخادم.
 *
 * الجلسة الموثقة بخطوتين (aal2) — وهي جلسة كل موظف — تنتهي بعد 30 دقيقة خمول
 * أو 12 ساعة من الدخول. الجلسة العادية بعد 14 يوماً خمول أو 30 يوماً من الدخول.
 * قاعدة البيانات تفرض حد الـ12 ساعة على صلاحيات الموظف بشكل مستقل (is_staff).
 */

export type Aal = "aal1" | "aal2";

export type AmrEntry = { method: string; timestamp: number };

export type SessionClaims = {
  aal?: string;
  amr?: unknown;
  iat?: number;
};

export const SESSION_POLICY = {
  aal1: { idleMs: 14 * 24 * 60 * 60 * 1000, maxMs: 30 * 24 * 60 * 60 * 1000 },
  aal2: { idleMs: 30 * 60 * 1000, maxMs: 12 * 60 * 60 * 1000 },
} as const;

/** كوكي آخر نشاط. HttpOnly، يكتبه الـ proxy فقط. */
export const LAST_SEEN_COOKIE = "sh_seen";
/** لا نعيد كتابة كوكي النشاط أكثر من مرة في الدقيقة */
export const LAST_SEEN_WRITE_INTERVAL_MS = 60 * 1000;

export function claimAal(claims: SessionClaims | null | undefined): Aal {
  return claims?.aal === "aal2" ? "aal2" : "aal1";
}

function amrEntries(claims: SessionClaims | null | undefined): AmrEntry[] {
  if (!Array.isArray(claims?.amr)) return [];
  return claims.amr.filter(
    (e): e is AmrEntry => !!e && typeof e === "object" && typeof e.method === "string" && Number.isFinite(e.timestamp),
  );
}

/** وقت تسجيل الدخول (بالمللي ثانية): أقدم طريقة توثيق في الجلسة. يبقى ثابتاً عند تجديد الرمز. */
export function signedInAt(claims: SessionClaims | null | undefined): number | null {
  const ts = amrEntries(claims).map((e) => e.timestamp);
  if (ts.length === 0) return typeof claims?.iat === "number" ? claims.iat * 1000 : null;
  return Math.min(...ts) * 1000;
}

export type SessionVerdict = { ok: true } | { ok: false; reason: "idle" | "max_age" };

/**
 * هل ما زالت الجلسة صالحة؟ lastSeen من كوكي النشاط (قد يغيب في أول طلب بعد الدخول).
 */
export function checkSession(claims: SessionClaims, lastSeen: number | null, now: number): SessionVerdict {
  const policy = SESSION_POLICY[claimAal(claims)];
  const start = signedInAt(claims);
  if (start !== null && now - start > policy.maxMs) return { ok: false, reason: "max_age" };
  if (lastSeen !== null && now - lastSeen > policy.idleMs) return { ok: false, reason: "idle" };
  return { ok: true };
}

export function parseLastSeen(value: string | undefined): number | null {
  if (!value || !/^\d{1,15}$/.test(value)) return null;
  return Number(value);
}

export function shouldWriteLastSeen(lastSeen: number | null, now: number) {
  return lastSeen === null || now - lastSeen >= LAST_SEEN_WRITE_INTERVAL_MS;
}

/** المسارات التي يُعاد فيها توجيه صاحب الجلسة المنتهية إلى صفحة الدخول بدل متابعتها كزائر */
export function isProtectedPath(pathname: string) {
  return /^\/(account|dashboard|mfa|submit|reset-password)(\/|$)/.test(pathname);
}

/**
 * ما المطلوب من المستخدم قبل الوصول للصفحة المحمية؟
 * - "verify": لديه تطبيق مصادقة مفعّل والجلسة لم تُرفع بعد إلى aal2
 * - "enroll": موظف لم يفعّل المصادقة بخطوتين (إلزامية للموظفين)
 */
export function mfaRequirement(opts: { aal: Aal; hasVerifiedFactor: boolean; isStaffRole: boolean }): "verify" | "enroll" | null {
  if (opts.hasVerifiedFactor && opts.aal !== "aal2") return "verify";
  if (opts.isStaffRole && !opts.hasVerifiedFactor) return "enroll";
  return null;
}

/** رمز تطبيق المصادقة: 6 أرقام، مع قبول الأرقام العربية والمسافات */
export function normalizeTotp(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const digits = v
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/**
 * مسار إعادة التوجيه بعد الدخول: داخلي فقط. يرفض "//host" و"/\host" (المتصفح يعامل \ كـ /)
 * وأي محارف تحكم قد تُستغل لتجاوز الفحص.
 */
export function safeNext(next: unknown, fallback = "/account") {
  if (typeof next !== "string" || next.length > 2048) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const u = new URL(next, "http://internal.invalid");
    if (u.origin !== "http://internal.invalid") return fallback;
  } catch {
    return fallback;
  }
  return next;
}

const SECURE_COOKIES = process.env.NODE_ENV === "production";

/** خيارات كوكيز جلسة Supabase. ليست HttpOnly لأن رفع الملفات يتم من المتصفح مباشرة بجلسة المستخدم. */
export const AUTH_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  secure: SECURE_COOKIES,
  maxAge: SESSION_POLICY.aal1.maxMs / 1000,
} as const;

export const LAST_SEEN_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  secure: SECURE_COOKIES,
  httpOnly: true,
  maxAge: SESSION_POLICY.aal1.maxMs / 1000,
} as const;
