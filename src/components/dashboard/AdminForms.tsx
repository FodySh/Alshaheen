"use client";
import { ActionForm } from "../forms/ActionForm";
import { useActionState } from "react";
import { addStaff, updateComplaint, updateSettings } from "@/lib/actions/staff";
import type { ComplaintStatus, OfficeSettings } from "@/lib/types";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

export function ComplaintUpdate({ id, status, response }: { id: string; status: ComplaintStatus; response: string | null }) {
  const [state, action] = useActionState(updateComplaint, null);
  return (
    <ActionForm action={action} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
        <select name="status" defaultValue={status} className="field" aria-label="الحالة">
          <option value="new">جديدة</option>
          <option value="in_progress">قيد المعالجة</option>
          <option value="resolved">تمت المعالجة</option>
        </select>
        <textarea name="response" defaultValue={response ?? ""} maxLength={2000} className="field min-h-11" placeholder="الإجراء المتخذ / الرد (يصل لصاحب الشكوى عند المعالجة)" aria-label="الرد" />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton className="btn btn-secondary btn-sm">احفظ</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}

export function AddStaffForm() {
  const [state, action] = useActionState(addStaff, null);
  return (
    <ActionForm action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <div>
          <label htmlFor="staff-email" className="label">بريد الموظف</label>
          <input id="staff-email" name="email" type="email" required className="field field-ltr" />
        </div>
        <div>
          <label htmlFor="staff-role" className="label">الصلاحية</label>
          <select id="staff-role" name="role" className="field" defaultValue="agent">
            <option value="agent">وسيط</option>
            <option value="admin">مدير</option>
          </select>
        </div>
        <SubmitButton pendingLabel="…">أضف للفريق</SubmitButton>
      </div>
      <span className="hint">يسجّل الموظف حساباً في الموقع أولاً من صفحة &quot;حساب جديد&quot;، ثم تضيفه هنا ببريده.</span>
      <FormMessage state={state} />
    </ActionForm>
  );
}

const SETTINGS_FIELDS: { name: keyof OfficeSettings; label: string; hint?: string; ltr?: boolean; wide?: boolean; area?: boolean }[] = [
  { name: "office_name", label: "اسم المكتب" },
  { name: "fal_license_number", label: "رقم رخصة فال", hint: "يظهر في كل صفحة عرض وفي تذييل الموقع.", ltr: true },
  { name: "cr_number", label: "رقم السجل التجاري", ltr: true },
  { name: "phone", label: "رقم التواصل", ltr: true },
  { name: "whatsapp", label: "رقم واتساب", ltr: true },
  { name: "email", label: "البريد العام", ltr: true },
  { name: "address", label: "العنوان", wide: true },
  { name: "about", label: "نبذة عن المكتب", hint: "تظهر في تذييل الموقع.", wide: true, area: true },
];

export function SettingsForm({ settings }: { settings: OfficeSettings }) {
  const [state, action] = useActionState(updateSettings, null);
  return (
    <ActionForm action={action} className="grid gap-5 sm:grid-cols-2">
      {SETTINGS_FIELDS.map((f) => (
        <div key={f.name} className={f.wide ? "sm:col-span-2" : undefined}>
          <label htmlFor={f.name} className="label">{f.label}</label>
          {f.area ? (
            <textarea id={f.name} name={f.name} defaultValue={settings[f.name] ?? ""} maxLength={600} className="field" />
          ) : (
            <input id={f.name} name={f.name} defaultValue={settings[f.name] ?? ""} className={`field ${f.ltr ? "field-ltr num" : ""}`} required={f.name === "office_name"} />
          )}
          {f.hint && <span className="hint">{f.hint}</span>}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton>احفظ الإعدادات</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
