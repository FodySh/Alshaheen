"use client";
import { ActionForm } from "../forms/ActionForm";
import { useActionState, useState } from "react";
import { staffCancelBooking } from "@/lib/actions/staff";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

export function CancelBooking({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(staffCancelBooking, null);
  if (state?.ok) return <FormMessage state={state} />;
  if (!open)
    return (
      <button type="button" className="btn btn-danger btn-sm" onClick={() => setOpen(true)}>
        إلغاء
      </button>
    );
  return (
    <ActionForm action={action} className="grid w-full gap-2 sm:w-80">
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`reason-${id}`} className="label">سبب الإلغاء (يصل للزائر)</label>
      <input id={`reason-${id}`} name="reason" required minLength={3} maxLength={300} className="field" autoFocus />
      <div className="flex gap-2">
        <SubmitButton className="btn btn-danger btn-sm" pendingLabel="جارٍ الإلغاء…">ألغِ الحجز</SubmitButton>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>تراجع</button>
      </div>
      <FormMessage state={state} />
    </ActionForm>
  );
}
