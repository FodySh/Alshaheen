"use client";
import { ActionForm } from "../forms/ActionForm";
import { useActionState } from "react";
import { createSlots } from "@/lib/actions/staff";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

export function SlotForm({ today, staff, defaultAgent }: { today: string; staff?: { id: string; full_name: string }[]; defaultAgent: string }) {
  const [state, action] = useActionState(createSlots, null);
  return (
    <ActionForm action={action} className="grid gap-4">
      {staff && staff.length > 0 && (
        <div>
          <label htmlFor="agent_id" className="label">الوسيط</label>
          <select id="agent_id" name="agent_id" defaultValue={defaultAgent} className="field">
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name || "بدون اسم"}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="date" className="label">التاريخ</label>
          <input id="date" name="date" type="date" min={today} defaultValue={today} required className="field num" />
        </div>
        <div>
          <label htmlFor="from" className="label">من</label>
          <input id="from" name="from" type="time" defaultValue="16:00" required step={900} className="field num" />
        </div>
        <div>
          <label htmlFor="to" className="label">إلى</label>
          <input id="to" name="to" type="time" defaultValue="21:00" required step={900} className="field num" />
        </div>
        <div>
          <label htmlFor="duration" className="label">مدة الموعد</label>
          <select id="duration" name="duration" defaultValue="45" className="field">
            <option value="30">30 دقيقة</option>
            <option value="45">45 دقيقة</option>
            <option value="60">ساعة</option>
            <option value="90">ساعة ونصف</option>
          </select>
        </div>
        <div>
          <label htmlFor="weeks" className="label">كرّر أسبوعياً</label>
          <select id="weeks" name="weeks" defaultValue="0" className="field">
            <option value="0">لا</option>
            {[1, 2, 3, 4, 6, 8].map((w) => (
              <option key={w} value={w}>{w} {w <= 2 ? (w === 1 ? "أسبوع" : "أسبوعين") : "أسابيع"}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="hint -mt-2">الأوقات بتوقيت السعودية. يرى الزوار المواعيد التي تبدأ بعد ساعتين على الأقل وخلال 30 يوماً.</p>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="جارٍ الإضافة…">أضف المواعيد</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
