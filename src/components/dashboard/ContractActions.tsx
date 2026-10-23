"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { addContractNote, assignContract, setContractStatus } from "@/lib/actions/contracts";
import { CONTRACT_STATUS_LABEL } from "@/lib/constants";
import type { ActionState, ContractStatus } from "@/lib/types";
import { ActionForm } from "../forms/ActionForm";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

export function ContractAssignForm({ contractId, current, staff }: { contractId: string; current: string | null; staff: { id: string; full_name: string }[] }) {
  const [state, action] = useActionState(assignContract, null);
  return (
    <ActionForm action={action} className="grid gap-2">
      <input type="hidden" name="contract_id" value={contractId} />
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

const NEXT: ContractStatus[] = ["contacted", "awaiting_data", "sent_to_ejar", "documented", "cancelled"];

export function ContractStatusForm({ contractId, current, minEnd }: { contractId: string; current: ContractStatus; minEnd: string }) {
  const [status, setStatus] = useState<ContractStatus | "">("");
  const ref = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(async (prev: ActionState | null, fd: FormData) => {
    const result = await setContractStatus(prev, fd);
    if (result.ok) {
      setStatus("");
      ref.current?.reset();
    }
    return result;
  }, null);
  const forced = status === "documented" || status === "cancelled";
  return (
    <ActionForm ref={ref} action={action} className="grid gap-3">
      <input type="hidden" name="contract_id" value={contractId} />
      <div>
        <label htmlFor="status" className="label">غيّر الحالة</label>
        <select id="status" name="status" required className="field" value={status} onChange={(e) => setStatus(e.target.value as ContractStatus)}>
          <option value="" disabled>اختر الحالة الجديدة</option>
          {NEXT.filter((s) => s !== current).map((s) => (
            <option key={s} value={s}>{CONTRACT_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>
      {status === "documented" && (
        <div className="grid gap-3 rounded-md bg-olive-tint/50 p-3">
          <div>
            <label htmlFor="ejar_number" className="label">رقم عقد إيجار</label>
            <input id="ejar_number" name="ejar_number" required maxLength={40} className="field field-ltr num" />
          </div>
          <div>
            <label htmlFor="end_date" className="label">تاريخ انتهاء العقد</label>
            <input id="end_date" name="end_date" type="date" required min={minEnd} className="field num" />
            <span className="hint">ننبّه الوسيط والعميل قبل الانتهاء بـ60 يوماً للتجديد.</span>
          </div>
        </div>
      )}
      <div>
        <label htmlFor="ct-note" className="label">{status === "cancelled" ? "سبب الإلغاء (يظهر لمقدم الطلب)" : "ملاحظة (اختياري)"}</label>
        <textarea id="ct-note" name="note" className="field min-h-20" required={status === "cancelled"} maxLength={1000} />
      </div>
      {!forced && (
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

export function ContractNoteForm({ contractId }: { contractId: string }) {
  const [state, action] = useActionState(addContractNote, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <ActionForm ref={ref} action={action} className="grid gap-2">
      <input type="hidden" name="contract_id" value={contractId} />
      <label htmlFor="ct-msg" className="label">ملاحظة أو رسالة</label>
      <textarea id="ct-msg" name="note" required minLength={2} maxLength={1000} className="field min-h-20" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="visible" className="size-4 accent-olive" />
        أرسلها لمقدم الطلب (تظهر في حسابه ويصله بريد)
      </label>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-secondary">أضف</SubmitButton>
    </ActionForm>
  );
}
