"use client";
import { ActionForm } from "../forms/ActionForm";
import { useActionState, useEffect, useRef } from "react";
import { addDistrict, addStaff, deleteDistrict, updateComplaint, updateSettings } from "@/lib/actions/staff";
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

export function DistrictsManager({ districts }: { districts: string[] }) {
  const [state, action] = useActionState(addDistrict, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <div className="grid gap-4">
      <ActionForm ref={ref} action={action} className="grid gap-2">
        <label htmlFor="district-name" className="label">أضف حياً</label>
        <div className="flex max-w-md gap-2">
          <input id="district-name" name="name" required minLength={2} maxLength={60} className="field" placeholder="مثال: الصفا" />
          <SubmitButton className="btn btn-secondary" pendingLabel="…">أضف</SubmitButton>
        </div>
        <FormMessage state={state} />
      </ActionForm>
      <div>
        <p className="text-sm text-ink-soft">
          <span className="num">{districts.length}</span> حياً في القائمة. حذف الحي لا يؤثر على العروض والطلبات المسجلة فيه.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {districts.map((d) => (
            <li key={d} className="flex items-center gap-1 rounded-md border border-sand-deep bg-white py-1 ps-3 pe-1 text-sm">
              {d}
              <form
                action={deleteDistrict}
                onSubmit={(e) => {
                  if (!confirm(`حذف حي "${d}" من القائمة؟`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="name" value={d} />
                <button type="submit" className="rounded px-1.5 text-ink-soft hover:bg-danger-tint hover:text-danger" aria-label={`احذف حي ${d}`}>
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
