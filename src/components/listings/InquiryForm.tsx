"use client";
import { ActionForm } from "../forms/ActionForm";
import { useActionState } from "react";
import { createInquiry } from "@/lib/actions/visitor";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

export function InquiryForm({ listingId }: { listingId: string }) {
  const [state, action] = useActionState(createInquiry, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <ActionForm action={action} className="grid gap-3">
      <input type="hidden" name="listing_id" value={listingId} />
      <div>
        <label htmlFor="inq-message" className="label">استفسارك</label>
        <textarea id="inq-message" name="message" required minLength={5} maxLength={2000} className="field" placeholder="مثال: هل السعر قابل للتفاوض؟ هل يوجد موقف خاص؟" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ الإرسال…">أرسل الاستفسار</SubmitButton>
    </ActionForm>
  );
}
