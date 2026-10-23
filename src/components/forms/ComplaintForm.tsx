"use client";
import { ActionForm } from "./ActionForm";
import { useActionState } from "react";
import { submitComplaint } from "@/lib/actions/visitor";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function ComplaintForm({ name = "", phone = "", email = "" }: { name?: string; phone?: string; email?: string }) {
  const [state, action] = useActionState(submitComplaint, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <ActionForm action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="hidden" aria-hidden>
        <label>الموقع<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div>
        <label htmlFor="c-name" className="label">الاسم</label>
        <input id="c-name" name="name" required defaultValue={name} className="field" />
      </div>
      <div>
        <label htmlFor="c-phone" className="label">رقم الجوال</label>
        <input id="c-phone" name="phone" required defaultValue={phone} inputMode="tel" className="field field-ltr num" placeholder="05xxxxxxxx" />
      </div>
      <div>
        <label htmlFor="c-email" className="label">البريد <span className="font-normal text-ink-soft">(اختياري)</span></label>
        <input id="c-email" name="email" type="email" defaultValue={email} className="field field-ltr" />
      </div>
      <div>
        <label htmlFor="c-ref" className="label">رقم العرض أو الطلب <span className="font-normal text-ink-soft">(إن وجد)</span></label>
        <input id="c-ref" name="listing_ref" className="field num" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-subject" className="label">العنوان</label>
        <input id="c-subject" name="subject" required minLength={3} maxLength={150} className="field" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-body" className="label">التفاصيل</label>
        <textarea id="c-body" name="body" required minLength={10} maxLength={3000} className="field" />
      </div>
      <div className="grid gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <div><SubmitButton pendingLabel="جارٍ الإرسال…">أرسل الشكوى</SubmitButton></div>
      </div>
    </ActionForm>
  );
}
