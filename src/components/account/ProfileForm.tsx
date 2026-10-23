"use client";
import { ActionForm } from "../forms/ActionForm";
import { useActionState } from "react";
import { updateMyProfile } from "@/lib/actions/visitor";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string | null }) {
  const [state, action] = useActionState(updateMyProfile, null);
  return (
    <ActionForm action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="pf-name" className="label">الاسم الكامل</label>
        <input id="pf-name" name="full_name" defaultValue={fullName} required className="field" />
      </div>
      <div>
        <label htmlFor="pf-phone" className="label">رقم الجوال</label>
        <input id="pf-phone" name="phone" defaultValue={phone} required pattern="05[0-9]{8}" className="field field-ltr num" />
      </div>
      <div className="sm:col-span-2">
        <p className="label">البريد الإلكتروني</p>
        <p className="text-ink-soft" dir="ltr" style={{ textAlign: "right" }}>{email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton className="btn btn-secondary">احفظ البيانات</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
