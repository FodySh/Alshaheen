"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionUser, getSessionUser, hasStaffRole, isAdmin, safeNext } from "../auth";
import { sendMail } from "../email";
import { normalizeTotp } from "../session";
import { createAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import type { ActionState } from "../types";

export type Enrollment = { error?: string; factorId?: string; qr?: string; secret?: string };

const CODE_ERROR = "الرمز غير صحيح أو انتهت صلاحيته. اكتب الرمز الظاهر الآن في التطبيق.";

function mfaError(message: string | undefined) {
  const m = (message ?? "").toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) return "محاولات كثيرة. انتظر بضع دقائق ثم حاول مجدداً.";
  if (m.includes("invalid") || m.includes("expired") || m.includes("code")) return CODE_ERROR;
  return "تعذّر إتمام العملية. حاول مرة أخرى.";
}

/** تنبيه أمني لصاحب الحساب: إن لم يكن هو من أجرى التغيير يعرف فوراً */
function securityNotice(to: string | null, heading: string) {
  after(() =>
    sendMail({
      to,
      subject: `تنبيه أمني: ${heading}`,
      heading,
      lines: [
        `الوقت: ${new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}.`,
        "إن لم تكن أنت، غيّر كلمة المرور فوراً وتواصل مع المكتب.",
      ],
      action: { label: "افتح حسابك", path: "/account#security" },
    }),
  );
}

function landing(u: { profile: { role: string; is_active: boolean } }) {
  return u.profile.is_active && u.profile.role !== "visitor" ? "/dashboard" : "/account";
}

/** يبدأ ربط تطبيق المصادقة: يعيد رمز QR والمفتاح للإدخال اليدوي. */
export async function startEnrollment(): Promise<Enrollment> {
  const u = await getSessionUser();
  if (!u) return { error: "سجّل الدخول أولاً." };
  if (u.hasMfa) return { error: "تطبيق المصادقة مفعّل مسبقاً." };

  const supabase = await createClient();
  // محاولة سابقة لم تكتمل تمنع إنشاء عامل جديد بالاسم نفسه
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "تطبيق المصادقة",
    issuer: "الشاهين لإدارة الأملاك",
  });
  if (error || !data) return { error: mfaError(error?.message) };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** يؤكد الربط بأول رمز من التطبيق، فترتفع الجلسة إلى aal2، وتُنهى بقية الجلسات. */
export async function confirmEnrollment(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const u = await getSessionUser();
  if (!u) return { error: "سجّل الدخول أولاً." };
  const factorId = z.string().uuid().safeParse(fd.get("factor_id"));
  const code = normalizeTotp(fd.get("code"));
  if (!factorId.success) return { error: "ابدأ الربط من جديد." };
  if (!code) return { error: "الرمز 6 أرقام." };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factorId.data, code });
  if (error) return { error: mfaError(error.message) };
  // أي جلسة فُتحت بكلمة المرور وحدها قبل التفعيل تُغلق
  await supabase.auth.signOut({ scope: "others" });
  securityNotice(u.email, "رُبط تطبيق مصادقة بحسابك");
  redirect(safeNext(fd.get("next"), landing(u)));
}

/** خطوة الدخول الثانية: رمز التطبيق. */
export async function verifyMfa(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  const code = normalizeTotp(fd.get("code"));
  if (!code) return { error: "الرمز 6 أرقام." };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];
  if (!factor) return { error: "لا يوجد تطبيق مصادقة مرتبط بحسابك." };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { error: mfaError(error.message) };
  redirect(safeNext(fd.get("next"), landing(u)));
}

/** إلغاء تطبيق المصادقة: للعملاء فقط (إلزامي للموظفين)، ويتطلب رمزاً حالياً. */
export async function disableMfa(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const u = await actionUser();
  if (!u) return { error: "سجّل الدخول أولاً." };
  if (hasStaffRole(u)) return { error: "المصادقة بخطوتين إلزامية لموظفي المكتب." };
  const code = normalizeTotp(fd.get("code"));
  if (!code) return { error: "الرمز 6 أرقام." };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];
  if (!factor) return { error: "لا يوجد تطبيق مصادقة مرتبط بحسابك." };
  const { error: vErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (vErr) return { error: mfaError(vErr.message) };
  const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
  if (error) return { error: mfaError(error.message) };
  securityNotice(u.email, "أُلغيت المصادقة بخطوتين في حسابك");
  revalidatePath("/account");
  return { ok: true, message: "أُلغي تطبيق المصادقة." };
}

/** يُنهي الجلسة على كل الأجهزة، ومنها هذا الجهاز. */
export async function signOutEverywhere() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?signed_out=all");
}

/**
 * للمدير: إعادة ضبط مصادقة موظف فقد جهازه. يحذف عوامله وينهي كل جلساته،
 * فيُطلب منه ربط تطبيق جديد عند دخوله التالي.
 */
export async function resetMemberMfa(fd: FormData) {
  const u = await actionUser();
  if (!isAdmin(u)) return;
  const target = z.string().uuid().safeParse(fd.get("user_id"));
  if (!target.success || target.data === u!.id) return;

  // تأكيد الصلاحية من قاعدة البيانات أيضاً قبل استخدام المفتاح السري
  const supabase = await createClient();
  const { data: confirmed } = await supabase.rpc("is_admin");
  if (confirmed !== true) return;

  const admin = createAdminClient();
  if (!admin) return;
  const { data } = await admin.auth.admin.mfa.listFactors({ userId: target.data });
  for (const f of data?.factors ?? []) await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: target.data });
  await admin.rpc("revoke_user_sessions", { p_user: target.data });
  const { data: member } = await admin.from("profiles").select("email").eq("id", target.data).maybeSingle();
  securityNotice(member?.email ?? null, "أعاد المدير ضبط المصادقة بخطوتين في حسابك");
  revalidatePath("/dashboard/team");
}
