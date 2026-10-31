"use client";
import { ActionForm } from "../forms/ActionForm";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signInWithGoogle, signUp, updatePassword } from "@/lib/actions/auth";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** زر الدخول بحساب Google، مع فاصل «أو» تحته */
export function GoogleSignIn({ next, label }: { next: string; label: string }) {
  return (
    <div className="grid gap-4">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <SubmitButton className="btn btn-secondary w-full gap-2" pendingLabel="جارٍ التحويل إلى Google…">
          <GoogleIcon />
          {label}
        </SubmitButton>
      </form>
      <div className="flex items-center gap-3 text-xs text-ink-soft" role="separator">
        <span className="h-px flex-1 bg-sand-deep" />
        أو بالبريد الإلكتروني
        <span className="h-px flex-1 bg-sand-deep" />
      </div>
    </div>
  );
}

export function LoginForm({ next, notice, google }: { next: string; notice?: string; google?: boolean }) {
  const [state, action] = useActionState(signIn, null);
  return (
    <div className="grid gap-4">
      {notice && <p className="rounded-md bg-clay-tint px-3 py-2 text-sm text-clay">{notice}</p>}
      {google && <GoogleSignIn next={next} label="الدخول بحساب Google" />}
      <ActionForm action={action} className="grid gap-4">
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
    </div>
  );
}

export function RegisterForm({ next, google }: { next: string; google?: boolean }) {
  const [state, action] = useActionState(signUp, null);
  if (state?.ok)
    return (
      <div className="grid gap-4">
        <FormMessage state={state} />
        <p className="text-sm leading-7 text-ink-soft">لم يصلك البريد؟ تحقق من مجلد الرسائل غير المرغوبة، أو انتظر دقيقة ثم سجّل مرة أخرى.</p>
      </div>
    );
  return (
    <div className="grid gap-4">
      {google && <GoogleSignIn next={next} label="التسجيل بحساب Google" />}
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
    </div>
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
