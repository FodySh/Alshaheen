"use client";
import { ActionForm } from "../forms/ActionForm";
import { useActionState } from "react";
import { replyInquiry } from "@/lib/actions/staff";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

export function InquiryReply({ id, reply }: { id: string; reply: string | null }) {
  const [state, action] = useActionState(replyInquiry, null);
  return (
    <ActionForm action={action} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`reply-${id}`} className="sr-only">الرد</label>
      <textarea id={`reply-${id}`} name="reply" defaultValue={reply ?? ""} maxLength={2000} className="field min-h-20" placeholder="اكتب الرد. يصل للزائر في حسابه وعلى بريده." />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton className="btn btn-primary btn-sm" pendingLabel="جارٍ الإرسال…">{reply ? "حدّث الرد" : "أرسل الرد"}</SubmitButton>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="close" className="size-4 accent-olive" /> أغلق الاستفسار
        </label>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
