// فحص أمني شامل على نسخة تعمل من الموقع ومشروع Supabase الحقيقي.
// ينشئ حساب اختبار مؤقتاً (وسيط)، ويجرّب الحمايات، ثم يحذفه دائماً.
//
//   npm run build && npx next start -p 3100
//   node --env-file=.env.local scripts/security-e2e.mjs http://localhost:3100
//
// يحتاج SUPABASE_SECRET_KEY لإنشاء حساب الاختبار وحذفه.

import { createHmac, randomBytes } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const BASE = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !PUB || !SECRET) throw new Error("Missing Supabase env (see .env.example)");

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

// ---------- TOTP (RFC 6238) ----------
function base32(s) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function totp(secret, at = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const h = createHmac("sha1", base32(secret)).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

// ---------- جلسة متصفح محاكاة بكوكيز @supabase/ssr ----------
function browserSession() {
  const jar = new Map();
  const supabase = createServerClient(URL_, PUB, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  return { supabase, jar };
}
const cookieHeader = (jar, extra = {}) =>
  [...jar, ...Object.entries(extra)].map(([k, v]) => `${k}=${v}`).join("; ");

async function get(path, cookie, init = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", ...init, headers: { ...(cookie ? { cookie } : {}), ...init.headers } });
  const body = res.status === 200 ? await res.text() : "";
  return { res, body };
}
/** مكان إعادة التوجيه: من ترويسة Location، أو من إعادة توجيه داخل البث (صفحات PPR) */
function redirectTarget({ res, body }) {
  const loc = res.headers.get("location");
  if (loc) return new URL(loc, BASE).pathname + new URL(loc, BASE).search;
  const m = body.match(/NEXT_REDIRECT;(?:replace|push);([^;"\\]+)/) ?? body.match(/http-equiv="refresh" content="\d+;url=([^"]+)"/);
  return m ? decodeURIComponent(m[1].replace(/&amp;/g, "&")) : null;
}

const admin = createClient(URL_, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `security-e2e-${Date.now()}@example.com`;
const password = randomBytes(18).toString("base64url");
let userId = null;

try {
  // ===== 1. ترويسات الأمان =====
  {
    const { res } = await get("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    check("CSP present with frame-ancestors 'none'", csp.includes("frame-ancestors 'none'"));
    check("CSP blocks <object> and <base> injection", csp.includes("object-src 'none'") && csp.includes("base-uri 'self'"));
    check("HSTS header", /max-age=\d{7,}/.test(res.headers.get("strict-transport-security") ?? ""));
    check("X-Frame-Options DENY", res.headers.get("x-frame-options") === "DENY");
    check("X-Content-Type-Options nosniff", res.headers.get("x-content-type-options") === "nosniff");
    check("Referrer-Policy set", !!res.headers.get("referrer-policy"));
    check("X-Powered-By hidden", !res.headers.get("x-powered-by"));
  }

  // ===== 2. إعادة التوجيه المفتوحة =====
  for (const evil of ["//evil.example", "/\\evil.example", "https://evil.example"]) {
    const { body } = await get(`/login?next=${encodeURIComponent(evil)}`);
    const next = body.match(/name="next" value="([^"]*)"/)?.[1];
    check(`login ?next=${evil} is neutralised`, next === "/account", `next=${next}`);
  }

  // ===== 3. تسجيل الخروج عبر موقع آخر (CSRF) =====
  {
    const cross = await fetch(BASE + "/auth/signout", { method: "POST", redirect: "manual", headers: { origin: "https://evil.example" } });
    check("cross-origin POST /auth/signout rejected", cross.status === 403, `status=${cross.status}`);
    const site = await fetch(BASE + "/auth/signout", { method: "POST", redirect: "manual", headers: { "sec-fetch-site": "cross-site" } });
    check("Sec-Fetch-Site: cross-site signout rejected", site.status === 403, `status=${site.status}`);
    const same = await fetch(BASE + "/auth/signout", { method: "POST", redirect: "manual", headers: { origin: BASE } });
    check("same-origin signout works", same.status === 303, `status=${same.status}`);
  }

  // ===== 4. بلا جلسة =====
  {
    const r = redirectTarget(await get("/dashboard"));
    check("anonymous /dashboard -> login", r?.startsWith("/login") ?? false, String(r));
    const a = redirectTarget(await get("/account"));
    check("anonymous /account -> login", a?.startsWith("/login") ?? false, String(a));
  }

  // ===== حساب اختبار: وسيط =====
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Security E2E", phone: "0500000000" },
  });
  if (cErr) throw cErr;
  userId = created.user.id;
  const { error: roleErr } = await admin.from("profiles").update({ role: "agent" }).eq("id", userId);
  if (roleErr) throw roleErr;

  const s = browserSession();
  const { error: sErr } = await s.supabase.auth.signInWithPassword({ email, password });
  if (sErr) throw sErr;

  // ===== 5. وسيط بكلمة مرور فقط =====
  {
    const r = redirectTarget(await get("/dashboard", cookieHeader(s.jar)));
    check("staff without MFA: /dashboard -> /mfa/setup", r?.startsWith("/mfa/setup") ?? false, String(r));
    const { data: isStaff } = await s.supabase.rpc("is_staff");
    check("DB: is_staff() false for password-only staff session", isStaff === false, `is_staff=${isStaff}`);
    const { data: allProfiles } = await s.supabase.from("profiles").select("id");
    check("DB: password-only staff sees only own profile", (allProfiles ?? []).length === 1, `rows=${allProfiles?.length}`);
    const { error: upErr } = await s.supabase.from("profiles").update({ role: "admin" }).eq("id", userId);
    check("DB: user cannot promote own role", !!upErr, upErr?.code ?? "no error");
  }

  // ===== 6. ربط تطبيق المصادقة =====
  const { data: enrolled, error: eErr } = await s.supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "e2e" });
  if (eErr) throw eErr;
  const { error: badErr } = await s.supabase.auth.mfa.challengeAndVerify({ factorId: enrolled.id, code: "000000" === totp(enrolled.totp.secret) ? "111111" : "000000" });
  check("wrong TOTP code rejected", !!badErr, badErr?.code ?? "accepted!");
  const { error: vErr } = await s.supabase.auth.mfa.challengeAndVerify({ factorId: enrolled.id, code: totp(enrolled.totp.secret) });
  check("valid TOTP code accepted (session -> aal2)", !vErr, vErr?.message ?? "");

  // ===== 7. دخول جديد بكلمة المرور فقط بعد تفعيل المصادقة =====
  const s1 = browserSession();
  await s1.supabase.auth.signInWithPassword({ email, password });
  {
    const r = redirectTarget(await get("/dashboard", cookieHeader(s1.jar)));
    check("MFA user, aal1 session: /dashboard -> /mfa/verify", r?.startsWith("/mfa/verify") ?? false, String(r));
    const a = redirectTarget(await get("/account", cookieHeader(s1.jar)));
    check("MFA user, aal1 session: /account -> /mfa/verify", a?.startsWith("/mfa/verify") ?? false, String(a));
    const { data: isStaff } = await s1.supabase.rpc("is_staff");
    check("DB: is_staff() false at aal1 even with MFA enrolled", isStaff === false, `is_staff=${isStaff}`);
    const { error: unErr } = await s1.supabase.auth.mfa.unenroll({ factorId: enrolled.id });
    check("aal1 session cannot remove the authenticator", !!unErr, unErr?.code ?? "removed!");
  }

  // ===== 8. جلسة موثقة بخطوتين =====
  const { data: f } = await s1.supabase.auth.mfa.listFactors();
  // رمز جديد: Supabase يرفض إعادة استخدام الرمز نفسه
  await new Promise((r) => setTimeout(r, Math.max(0, 30_000 - (Date.now() % 30_000)) + 1000));
  const { error: v2 } = await s1.supabase.auth.mfa.challengeAndVerify({ factorId: f.totp[0].id, code: totp(enrolled.totp.secret) });
  check("second factor upgrades new session", !v2, v2?.message ?? "");
  {
    const { res, body } = await get("/dashboard", cookieHeader(s1.jar));
    check("aal2 staff session opens /dashboard", res.status === 200 && body.includes("لوحة المكتب"), `status=${res.status}`);
    const { data: isStaff } = await s1.supabase.rpc("is_staff");
    check("DB: is_staff() true at aal2", isStaff === true, `is_staff=${isStaff}`);
  }

  // ===== 9. انتهاء الجلسة بالخمول =====
  {
    const stale = String(Date.now() - 31 * 60 * 1000);
    const resp = await get("/dashboard", cookieHeader(s1.jar, { sh_seen: stale }));
    const r = redirectTarget(resp);
    check("aal2 session idle 31 min -> /login?expired=idle", r?.startsWith("/login?expired=idle") ?? false, String(r));
    const cleared = (resp.res.headers.getSetCookie?.() ?? []).some((c) => /^sb-[^=]+-auth-token[^=]*=;/.test(c) || /^sb-.*Max-Age=0/i.test(c));
    check("expired session cookies cleared", cleared);
    // الجلسة ألغيت على الخادم: رمز التجديد لم يعد صالحاً
    await new Promise((r) => setTimeout(r, 1500));
    const { error: refreshErr } = await s1.supabase.auth.refreshSession();
    check("expired session revoked server-side (refresh fails)", !!refreshErr, refreshErr?.code ?? "refreshed!");
  }

  // ===== 10. الجلسة العادية لا تتأثر بحد خمول الموظف =====
  {
    const c = browserSession();
    const { data: visitor } = await admin.auth.admin.createUser({ email: `v-${email}`, password, email_confirm: true });
    try {
      await c.supabase.auth.signInWithPassword({ email: `v-${email}`, password });
      const { res } = await get("/account", cookieHeader(c.jar, { sh_seen: String(Date.now() - 31 * 60 * 1000) }));
      check("visitor idle 31 min keeps session (14-day idle limit)", res.status === 200 && !res.headers.get("location"), `status=${res.status}`);
    } finally {
      await admin.auth.admin.deleteUser(visitor.user.id);
    }
  }
} catch (e) {
  check("script error", false, e instanceof Error ? e.message : String(e));
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    console.log(error ? `cleanup FAILED for ${email}: ${error.message}` : `cleanup: deleted ${email}`);
  }
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
