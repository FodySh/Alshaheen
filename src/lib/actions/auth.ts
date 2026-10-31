"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser, markSessionActive, safeNext } from "../auth";
import { sendMail } from "../email";
import { createClient } from "../supabase/server";
import type { ActionState } from "../types";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function authError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "البريد أو كلمة المرور غير صحيحة.";
  if (m.includes("email not confirmed")) return "فعّل حسابك أولاً من الرابط المرسل إلى بريدك.";
  if (m.includes("already registered") || m.includes("already been registered")) return "هذا البريد مسجّل مسبقاً. سجّل الدخول أو استعد كلمة المرور.";
  if (m.includes("rate limit") || m.includes("too many")) return "محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.";
  if (m.includes("password")) return "كلمة المرور لا تستوفي الشروط: 8 أحرف على الأقل.";
  if (m.includes("same")) return "اختر كلمة مرور مختلفة عن السابقة.";
  return "تعذّر إتمام العملية. حاول مرة أخرى.";
}

const email = z.string().trim().toLowerCase().email("اكتب بريداً إلكترونياً صحيحاً.");
const password = z.string().min(8, "كلمة المرور 8 أحرف على الأقل.").max(72);

export async function signIn(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const parsed = z.object({ email, password: z.string().min(1, "اكتب كلمة المرور.") }).safeParse({
    email: fd.get("email"),
    password: fd.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authError(error.message) };
  await markSessionActive();
  const next = safeNext(fd.get("next"));
  const hasMfa = (data.user?.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified");
  if (hasMfa) redirect(`/mfa/verify?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signUp(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      full_name: z.string().trim().min(3, "اكتب اسمك الكامل.").max(100),
      phone: z.string().trim().regex(/^05\d{8}$/, "رقم الجوال بصيغة 05xxxxxxxx."),
      email,
      password,
      terms: z.literal("on", { message: "وافق على الشروط وسياسة الخصوصية للمتابعة." }),
    })
    .safeParse({
      full_name: fd.get("full_name"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      password: fd.get("password"),
      terms: fd.get("terms"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const next = safeNext(fd.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name, phone: parsed.data.phone },
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: authError(error.message) };
  if (data.session) {
    await markSessionActive();
    redirect(next);
  }
  return {
    ok: true,
    message: `أرسلنا رابط تفعيل الحساب إلى ${parsed.data.email}. افتح الرابط لإكمال التسجيل.`,
  };
}

export async function requestPasswordReset(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const parsed = email.safeParse(fd.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password`,
  });
  // نفس الرد دائماً حتى لا نكشف وجود الحساب
  return { ok: true, message: "إن كان البريد مسجلاً لدينا فسيصلك رابط تعيين كلمة المرور خلال دقائق." };
}

export async function updatePassword(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "كلمتا المرور غير متطابقتين." })
    .safeParse({ password: fd.get("password"), confirm: fd.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await getSessionUser();
  if (!user) return { error: "انتهت صلاحية الرابط. اطلب رابطاً جديداً." };
  // من فعّل المصادقة بخطوتين يُدخل الرمز أولاً: رابط البريد وحده لا يكفي لتغيير كلمة المرور
  if (user.mfa === "verify") redirect("/mfa/verify?next=/reset-password");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authError(error.message) };
  // كلمة المرور القديمة ربما تسربت: أغلق الجلسات الأخرى
  await supabase.auth.signOut({ scope: "others" });
  after(() =>
    sendMail({
      to: user.email,
      subject: "تنبيه أمني: تغيّرت كلمة المرور",
      heading: "تغيّرت كلمة مرور حسابك",
      lines: ["سُجّل خروجك من كل الأجهزة الأخرى.", "إن لم تكن أنت، اطلب رابط تعيين جديد فوراً وتواصل مع المكتب."],
      action: { label: "افتح حسابك", path: "/account#security" },
    }),
  );
  redirect("/account");
}
