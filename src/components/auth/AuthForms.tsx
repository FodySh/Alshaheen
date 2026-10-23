"use client";
import { ActionForm } from "../forms/ActionForm";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/lib/actions/auth";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState(signIn, null);
  return (
    <ActionForm action={action} className="grid gap-4">
      {notice && <p className="rounded-md bg-clay-tint px-3 py-2 text-sm text-clay">{notice}</p>}
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field field-ltr" />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="label">كلمة المرور</label>
          <Link href="/forgot-password" className="text-sm text-olive-deep hover:underline">نسيت كلمة المرور؟</Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field field-ltr" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ الدخول…">دخول</SubmitButton>
      <p className="text-center text-sm text-ink-soft">
        ليس لديك حساب؟{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-olive-deep hover:underline">أنشئ حساباً</Link>
      </p>
    </ActionForm>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, null);
  if (state?.ok)
    return (
      <div className="grid gap-4">
        <FormMessage state={state} />
        <p className="text-sm leading-7 text-ink-soft">لم يصلك البريد؟ تحقق من مجلد الرسائل غير المرغوبة، أو انتظر دقيقة ثم سجّل مرة أخرى.</p>
      </div>
    );
  return (
    <ActionForm action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="full_name" className="label">الاسم الكامل</label>
        <input id="full_name" name="full_name" autoComplete="name" required minLength={3} className="field" />
      </div>
      <div>
        <label htmlFor="phone" className="label">رقم الجوال</label>
        <input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" required pattern="05[0-9]{8}" placeholder="05xxxxxxxx" className="field field-ltr num" />
        <span className="hint">يتواصل معك الوسيط على هذا الرقم.</span>
      </div>
      <div>
        <label htmlFor="email" className="label">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field field-ltr" />
      </div>
      <div>
        <label htmlFor="password" className="label">كلمة المرور</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="field field-ltr" />
        <span className="hint">8 أحرف على الأقل.</span>
      </div>
      <label className="flex items-start gap-2 text-sm leading-6">
        <input type="checkbox" name="terms" required className="mt-1 size-4 accent-olive" />
        <span>
          أوافق على <Link href="/privacy" className="text-olive-deep underline" target="_blank">سياسة الخصوصية</Link> واستخدام بياناتي للتواصل بخصوص طلباتي.
        </span>
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ إنشاء الحساب…">أنشئ الحساب</SubmitButton>
      <p className="text-center text-sm text-ink-soft">
        لديك حساب؟{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-olive-deep hover:underline">سجّل الدخول</Link>
      </p>
    </ActionForm>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <ActionForm action={action} className="grid gap-4">
      <div>
        <label htmlFor="email" className="label">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field field-ltr" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ الإرسال…">أرسل رابط التعيين</SubmitButton>
    </ActionForm>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(updatePassword, null);
  return (
    <ActionForm action={action} className="grid gap-4">
      <div>
        <label htmlFor="password" className="label">كلمة المرور الجديدة</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="field field-ltr" />
      </div>
      <div>
        <label htmlFor="confirm" className="label">أعد كتابتها</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className="field field-ltr" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ الحفظ…">احفظ كلمة المرور</SubmitButton>
    </ActionForm>
  );
}
