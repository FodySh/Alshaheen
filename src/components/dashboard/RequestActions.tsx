"use client";
import { ActionForm } from "../forms/ActionForm";
import { useActionState, useEffect, useRef, useState } from "react";
import { addRequestNote, assignRequest, setRequestStatus } from "@/lib/actions/staff";
import { REQUEST_STATUS_LABEL } from "@/lib/constants";
import type { ActionState, RequestStatus } from "@/lib/types";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

export function AssignForm({ requestId, current, staff }: { requestId: string; current: string | null; staff: { id: string; full_name: string }[] }) {
  const [state, action] = useActionState(assignRequest, null);
  return (
    <ActionForm action={action} className="grid gap-2">
      <input type="hidden" name="request_id" value={requestId} />
      <label htmlFor="agent_id" className="label">الوسيط المسؤول</label>
      <div className="flex gap-2">
        <select id="agent_id" name="agent_id" defaultValue={current ?? ""} required className="field">
          <option value="" disabled>اختر</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name || "بدون اسم"}</option>
          ))}
        </select>
        <SubmitButton className="btn btn-secondary" pendingLabel="…">إسناد</SubmitButton>
      </div>
      <FormMessage state={state} />
    </ActionForm>
  );
}

const MANUAL: RequestStatus[] = ["under_review", "awaiting_license", "closed", "rejected"];

export function StatusForm({ requestId, current }: { requestId: string; current: RequestStatus }) {
  const [status, setStatus] = useState<RequestStatus | "">("");
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(async (prev: ActionState | null, fd: FormData) => {
    const result = await setRequestStatus(prev, fd);
    if (result.ok) {
      setStatus("");
      ref.current?.reset();
    }
    return result;
  }, null);
  return (
    <ActionForm ref={ref} action={action} className="grid gap-3">
      <input type="hidden" name="request_id" value={requestId} />
      <div>
        <label htmlFor="status" className="label">غيّر الحالة</label>
        <select id="status" name="status" required className="field" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)}>
          <option value="" disabled>اختر الحالة الجديدة</option>
          {MANUAL.filter((s) => s !== current).map((s) => (
            <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <span className="hint">تتحول إلى &quot;منشور&quot; تلقائياً عند نشر العرض المرتبط.</span>
      </div>
      <div>
        <label htmlFor="st-note" className="label">{status === "rejected" ? "سبب الرفض (يظهر لمقدم الطلب)" : "ملاحظة (اختياري)"}</label>
        <textarea id="st-note" name="note" className="field min-h-20" required={status === "rejected"} maxLength={1000} />
      </div>
      {status !== "rejected" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="internal" className="size-4 accent-olive" />
          لا تُظهر هذا التغيير لمقدم الطلب
        </label>
      )}
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary">احفظ الحالة</SubmitButton>
    </ActionForm>
  );
}

export function NoteForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState(addRequestNote, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <ActionForm ref={ref} action={action} className="grid gap-2">
      <input type="hidden" name="request_id" value={requestId} />
      <label htmlFor="note" className="label">ملاحظة أو رسالة</label>
      <textarea id="note" name="note" required minLength={2} maxLength={1000} className="field min-h-20" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="visible" className="size-4 accent-olive" />
        أرسلها لمقدم الطلب (تظهر في حسابه ويصله بريد)
      </label>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-secondary">أضف</SubmitButton>
    </ActionForm>
  );
}
