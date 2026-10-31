"use client";
import { useActionState, useState, useTransition } from "react";
import { confirmEnrollment, disableMfa, startEnrollment, verifyMfa, type Enrollment } from "@/lib/actions/mfa";
import { ActionForm } from "../forms/ActionForm";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

function CodeField({ id = "code" }: { id?: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">الرمز من التطبيق</label>
      <input
        id={id}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        maxLength={7}
        pattern="[0-9٠-٩ ]{6,7}"
        placeholder="000000"
        className="field field-ltr num text-center text-lg tracking-[0.3em]"
      />
      <span className="hint">6 أرقام تتجدد كل 30 ثانية.</span>
    </div>
  );
}

export function MfaSetup({ next, required }: { next: string; required: boolean }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [starting, startTransition] = useTransition();
  const [state, action] = useActionState(confirmEnrollment, null);

  if (!enrollment?.factorId) {
    return (
      <div className="grid gap-4">
        <p className="leading-7">
          {required
            ? "حسابك من حسابات فريق المكتب، لذلك يلزم تفعيل المصادقة بخطوتين قبل فتح لوحة المكتب."
            : "بعد التفعيل يُطلب رمز من تطبيق المصادقة مع كلمة المرور عند كل دخول."}
        </p>
        <p className="text-sm leading-7 text-ink-soft">
          تحتاج تطبيق مصادقة على جوالك، مثل Google Authenticator أو Microsoft Authenticator أو 1Password.
        </p>
        <FormMessage state={enrollment?.error ? { error: enrollment.error } : null} />
        <button
          type="button"
          className="btn btn-primary"
          disabled={starting}
          onClick={() => startTransition(async () => setEnrollment(await startEnrollment()))}
        >
          {starting ? "جارٍ التجهيز…" : "ابدأ الربط"}
        </button>
      </div>
    );
  }

  return (
    <ActionForm action={action} className="grid gap-5">
      <input type="hidden" name="factor_id" value={enrollment.factorId} />
      <input type="hidden" name="next" value={next} />
      <ol className="grid list-decimal gap-2 ps-5 text-sm leading-7">
        <li>افتح تطبيق المصادقة واختر إضافة حساب.</li>
        <li>امسح الرمز أدناه، أو اكتب المفتاح يدوياً.</li>
        <li>اكتب الرمز المكوّن من 6 أرقام الذي يظهر في التطبيق.</li>
      </ol>
      <div className="mx-auto rounded-lg border border-sand-deep bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- رمز QR بصيغة data: من Supabase */}
        <img src={enrollment.qr} alt="رمز QR لربط تطبيق المصادقة" width={200} height={200} className="size-50" />
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-olive-deep">لا يمكنك المسح؟ اعرض المفتاح</summary>
        <p className="mt-2 break-all rounded-md bg-sand px-3 py-2 font-mono text-ink" dir="ltr">{enrollment.secret}</p>
      </details>
      <CodeField />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ التحقق…">فعّل المصادقة</SubmitButton>
    </ActionForm>
  );
}

export function MfaVerifyForm({ next }: { next: string }) {
  const [state, action] = useActionState(verifyMfa, null);
  return (
    <ActionForm action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <CodeField />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ التحقق…">تحقق</SubmitButton>
    </ActionForm>
  );
}

export function DisableMfaForm() {
  const [state, action] = useActionState(disableMfa, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-danger">إلغاء المصادقة بخطوتين</summary>
      <ActionForm action={action} className="mt-3 grid max-w-xs gap-3">
        <CodeField id="disable-code" />
        <FormMessage state={state} />
        <SubmitButton className="btn btn-quiet text-danger" pendingLabel="جارٍ الإلغاء…">ألغِ التفعيل</SubmitButton>
      </ActionForm>
    </details>
  );
}
