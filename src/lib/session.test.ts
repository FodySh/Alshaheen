import { describe, expect, it } from "vitest";
import {
  SESSION_POLICY,
  checkSession,
  claimAal,
  isProtectedPath,
  mfaRequirement,
  normalizeTotp,
  parseLastSeen,
  safeNext,
  shouldWriteLastSeen,
  signedInAt,
} from "./session";

const NOW = 1_800_000_000_000;
const sec = (ms: number) => Math.floor(ms / 1000);
const min = 60 * 1000;
const hour = 60 * min;
const day = 24 * hour;

describe("safeNext — يمنع إعادة التوجيه لموقع خارجي", () => {
  it.each(["/account", "/dashboard/requests?status=new", "/listings/abc#gallery", "/account%23security"])("يقبل %s", (p) => {
    expect(safeNext(p)).toBe(p);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\\/evil.example",
    "\\\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\u0000",
    "javascript:alert(1)",
    "account",
    "",
    "/" + "a".repeat(3000),
  ])("يرفض %j", (p) => {
    expect(safeNext(p)).toBe("/account");
  });

  it("يرفض غير النصوص ويستخدم البديل", () => {
    expect(safeNext(undefined, "/dashboard")).toBe("/dashboard");
    expect(safeNext(["/a"], "/dashboard")).toBe("/dashboard");
  });
});

describe("سياسة الجلسة", () => {
  const aal1 = (signedIn: number) => ({ aal: "aal1", amr: [{ method: "password", timestamp: sec(signedIn) }] });
  const aal2 = (signedIn: number) => ({
    aal: "aal2",
    amr: [
      { method: "totp", timestamp: sec(signedIn + min) },
      { method: "password", timestamp: sec(signedIn) },
    ],
  });

  it("وقت الدخول هو أقدم طريقة توثيق", () => {
    expect(signedInAt(aal2(NOW - hour))).toBe(sec(NOW - hour) * 1000);
  });

  it("يرجع إلى iat إن غاب amr، وإلى null إن غاب الاثنان", () => {
    expect(signedInAt({ iat: sec(NOW) })).toBe(sec(NOW) * 1000);
    expect(signedInAt({})).toBeNull();
    expect(signedInAt({ amr: ["password"] })).toBeNull();
  });

  it("aal مجهول يُعامل كـ aal1 (الأضعف)", () => {
    expect(claimAal({ aal: "aal3" })).toBe("aal1");
    expect(claimAal(null)).toBe("aal1");
  });

  it("جلسة عادية نشطة صالحة", () => {
    expect(checkSession(aal1(NOW - 10 * day), NOW - hour, NOW)).toEqual({ ok: true });
  });

  it("جلسة عادية تنتهي بعد 14 يوم خمول", () => {
    expect(checkSession(aal1(NOW - 20 * day), NOW - 15 * day, NOW)).toEqual({ ok: false, reason: "idle" });
  });

  it("جلسة عادية تنتهي بعد 30 يوماً حتى مع النشاط", () => {
    expect(checkSession(aal1(NOW - 31 * day), NOW - min, NOW)).toEqual({ ok: false, reason: "max_age" });
  });

  it("جلسة الموظف (aal2) تنتهي بعد 30 دقيقة خمول", () => {
    expect(checkSession(aal2(NOW - hour), NOW - 29 * min, NOW)).toEqual({ ok: true });
    expect(checkSession(aal2(NOW - hour), NOW - 31 * min, NOW)).toEqual({ ok: false, reason: "idle" });
  });

  it("جلسة الموظف تنتهي بعد 12 ساعة من الدخول", () => {
    expect(checkSession(aal2(NOW - 13 * hour), NOW - min, NOW)).toEqual({ ok: false, reason: "max_age" });
  });

  it("غياب كوكي النشاط لا ينهي الجلسة (أول طلب بعد الدخول)", () => {
    expect(checkSession(aal2(NOW - min), null, NOW)).toEqual({ ok: true });
  });

  it("الحدود منطقية", () => {
    expect(SESSION_POLICY.aal2.idleMs).toBeLessThan(SESSION_POLICY.aal1.idleMs);
    expect(SESSION_POLICY.aal2.maxMs).toBeLessThan(SESSION_POLICY.aal1.maxMs);
  });
});

describe("كوكي النشاط", () => {
  it("يقبل الأرقام فقط", () => {
    expect(parseLastSeen(String(NOW))).toBe(NOW);
    expect(parseLastSeen("1e12")).toBeNull();
    expect(parseLastSeen("-5")).toBeNull();
    expect(parseLastSeen("")).toBeNull();
    expect(parseLastSeen(undefined)).toBeNull();
  });

  it("لا يُكتب أكثر من مرة في الدقيقة", () => {
    expect(shouldWriteLastSeen(null, NOW)).toBe(true);
    expect(shouldWriteLastSeen(NOW - 30 * 1000, NOW)).toBe(false);
    expect(shouldWriteLastSeen(NOW - 61 * 1000, NOW)).toBe(true);
  });
});

describe("متطلبات المصادقة بخطوتين", () => {
  it("من فعّل التطبيق ولم يُدخل الرمز يُطلب منه الرمز — موظفاً كان أو عميلاً", () => {
    expect(mfaRequirement({ aal: "aal1", hasVerifiedFactor: true, isStaffRole: false })).toBe("verify");
    expect(mfaRequirement({ aal: "aal1", hasVerifiedFactor: true, isStaffRole: true })).toBe("verify");
  });

  it("الموظف بلا تطبيق مصادقة يُلزم بالربط", () => {
    expect(mfaRequirement({ aal: "aal1", hasVerifiedFactor: false, isStaffRole: true })).toBe("enroll");
  });

  it("العميل بلا تطبيق لا يُلزم، والجلسة الموثقة لا تحتاج شيئاً", () => {
    expect(mfaRequirement({ aal: "aal1", hasVerifiedFactor: false, isStaffRole: false })).toBeNull();
    expect(mfaRequirement({ aal: "aal2", hasVerifiedFactor: true, isStaffRole: true })).toBeNull();
  });
});

describe("رمز التطبيق", () => {
  it("يقبل 6 أرقام لاتينية أو عربية مع مسافات", () => {
    expect(normalizeTotp("123456")).toBe("123456");
    expect(normalizeTotp("١٢٣ ٤٥٦")).toBe("123456");
    expect(normalizeTotp("۱۲۳-۴۵۶")).toBe("123456");
  });

  it.each(["12345", "1234567", "12345a", "", null, 123456])("يرفض %j", (v) => {
    expect(normalizeTotp(v)).toBeNull();
  });
});

describe("المسارات المحمية", () => {
  it.each(["/account", "/account/requests/1", "/dashboard", "/dashboard/team", "/mfa/verify", "/submit", "/reset-password"])("%s محمي", (p) => {
    expect(isProtectedPath(p)).toBe(true);
  });

  it.each(["/", "/listings", "/accounting", "/login", "/dashboards"])("%s عام", (p) => {
    expect(isProtectedPath(p)).toBe(false);
  });
});
