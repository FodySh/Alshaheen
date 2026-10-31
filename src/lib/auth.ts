import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";
import { LAST_SEEN_COOKIE, LAST_SEEN_COOKIE_OPTIONS, mfaRequirement, type Aal } from "./session";
import type { Profile } from "./types";

export { safeNext } from "./session";

export type SessionUser = {
  id: string;
  email: string | null;
  profile: Profile;
  /** مستوى توثيق الجلسة الحالية: aal2 بعد إدخال رمز تطبيق المصادقة */
  aal: Aal;
  /** فعّل تطبيق مصادقة */
  hasMfa: boolean;
  /** خطوة المصادقة الناقصة قبل الوصول لما يحتاج الدخول */
  mfa: "verify" | "enroll" | null;
};

/** المستخدم الحالي وملفه، أو null. يُحسب مرة واحدة لكل طلب. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, is_active, created_at")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) return null;
  const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const aal: Aal = level?.currentLevel === "aal2" ? "aal2" : "aal1";
  const hasMfa = (data.user.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified");
  const p = profile as Profile;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    profile: p,
    aal,
    hasMfa,
    mfa: mfaRequirement({ aal, hasVerifiedFactor: hasMfa, isStaffRole: isStaffRole(p) }),
  };
});

function isStaffRole(p: Profile) {
  return p.is_active && (p.role === "agent" || p.role === "admin");
}

/** دوره موظف، بغض النظر عن مستوى الجلسة. للعرض فقط (مثل رابط لوحة المكتب). */
export function hasStaffRole(u: SessionUser | null) {
  return !!u && isStaffRole(u.profile);
}

/** المستخدم كما تراه صفحات الموقع العامة: من لم يُكمل رمز المصادقة يُعامل كزائر. */
export const getViewer = cache(async (): Promise<SessionUser | null> => {
  const u = await getSessionUser();
  return u?.mfa === "verify" ? null : u;
});

/** موظف نشط بجلسة موثقة بخطوتين. قاعدة البيانات تفرض الشرط نفسه في is_staff(). */
export function isStaff(u: SessionUser | null) {
  return !!u && isStaffRole(u.profile) && u.aal === "aal2";
}

export function isAdmin(u: SessionUser | null) {
  return isStaff(u) && u!.profile.role === "admin";
}

function mfaPath(step: "verify" | "enroll", next: string) {
  return `/mfa/${step === "verify" ? "verify" : "setup"}?next=${encodeURIComponent(next)}`;
}

/** لصفحات المصادقة بخطوتين نفسها: يكفي أن يكون مسجلاً، أياً كان مستوى الجلسة. */
export async function requireSignedIn(next = "/account") {
  const u = await getSessionUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireUser(next = "/account") {
  const u = await requireSignedIn(next);
  if (u.mfa === "verify") redirect(mfaPath("verify", next));
  return u;
}

export async function requireStaff(next = "/dashboard") {
  const u = await requireSignedIn(next);
  if (!isStaffRole(u.profile)) redirect("/account");
  if (u.mfa) redirect(mfaPath(u.mfa, next));
  return u;
}

export async function requireAdmin() {
  const u = await requireStaff();
  if (!isAdmin(u)) redirect("/dashboard");
  return u;
}

/**
 * للإجراءات (Server Actions): لا تعيد توجيه، بل تُرجع null.
 * من فعّل المصادقة بخطوتين ولم يدخل الرمز بعد يُعامل كغير مسجل.
 */
export async function actionUser() {
  const u = await getSessionUser();
  if (u?.mfa === "verify") return null;
  return u;
}

/** يبدأ عدّاد الخمول من الآن (عند الدخول)، حتى لا يُحتسب كوكي نشاط قديم على الجلسة الجديدة. */
export async function markSessionActive() {
  (await cookies()).set(LAST_SEEN_COOKIE, String(Date.now()), LAST_SEEN_COOKIE_OPTIONS);
}

export async function clearSessionActivity() {
  (await cookies()).delete(LAST_SEEN_COOKIE);
}
