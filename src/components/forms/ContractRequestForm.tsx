"use client";
import { useActionState, useState } from "react";
import { createContractRequest } from "@/lib/actions/contracts";
import { CONTRACT_DURATIONS, PROPERTY_GROUPS, PROPERTY_TYPE_LABEL } from "@/lib/constants";
import type { ContractParty } from "@/lib/types";
import { ActionForm } from "./ActionForm";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-sand-deep pt-8 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {hint && <p className="mt-1 text-sm leading-7 text-ink-soft">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Choice({ name, value, checked, onChange, title, hint }: { name: string; value: string; checked: boolean; onChange: () => void; title: string; hint?: string }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="peer sr-only" required />
      <span className="block h-full rounded-md border border-stone bg-white p-3.5 peer-checked:border-olive peer-checked:bg-olive-tint peer-focus-visible:outline-2 peer-focus-visible:outline-olive">
        <span className="block font-semibold">{title}</span>
        {hint && <span className="mt-0.5 block text-sm text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}

export function ContractRequestForm({ districts, today }: { districts: string[]; today: string }) {
  const [state, action] = useActionState(createContractRequest, null);
  const [role, setRole] = useState<ContractParty>("landlord");
  const [kind, setKind] = useState("residential");
  const [renewal, setRenewal] = useState("no");
  const [hasOther, setHasOther] = useState("yes");
  const [district, setDistrict] = useState("");
  const other = role === "tenant" ? "المؤجر" : "المستأجر";

  return (
    <ActionForm action={action} className="grid gap-8">
      <Section title="صفتك في العقد">
        <div className="grid gap-2 sm:grid-cols-3">
          <Choice name="requester_role" value="landlord" checked={role === "landlord"} onChange={() => setRole("landlord")} title="المالك" hint="أنا المؤجر" />
          <Choice name="requester_role" value="landlord_agent" checked={role === "landlord_agent"} onChange={() => setRole("landlord_agent")} title="وكيل عن المالك" hint="معي وكالة سارية" />
          <Choice name="requester_role" value="tenant" checked={role === "tenant"} onChange={() => setRole("tenant")} title="المستأجر" hint="أحتاج توثيق عقدي" />
        </div>
      </Section>

      <Section title="العقد">
        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className="label">نوع العقد</legend>
            <div className="grid grid-cols-2 gap-2">
              <Choice name="contract_kind" value="residential" checked={kind === "residential"} onChange={() => setKind("residential")} title="سكني" />
              <Choice name="contract_kind" value="commercial" checked={kind === "commercial"} onChange={() => setKind("commercial")} title="تجاري" />
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">جديد أم تجديد</legend>
            <div className="grid grid-cols-2 gap-2">
              <Choice name="is_renewal" value="no" checked={renewal === "no"} onChange={() => setRenewal("no")} title="عقد جديد" />
              <Choice name="is_renewal" value="yes" checked={renewal === "yes"} onChange={() => setRenewal("yes")} title="تجديد عقد" />
            </div>
          </fieldset>
        </div>
      </Section>

      <Section title="العقار">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="property_type" className="label">نوع العقار</label>
            <select id="property_type" name="property_type" required className="field" defaultValue="">
              <option value="" disabled>اختر النوع</option>
              {PROPERTY_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.types.map((t) => (
                    <option key={t} value={t}>{PROPERTY_TYPE_LABEL[t]}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="district" className="label">الحي (جدة)</label>
            <select id="district" name="district" required className="field" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="" disabled>اختر الحي</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
              <option value="__other">حي آخر…</option>
            </select>
          </div>
          {district === "__other" && (
            <div>
              <label htmlFor="district_other" className="label">اسم الحي</label>
              <input id="district_other" name="district_other" required minLength={2} maxLength={60} className="field" />
            </div>
          )}
          <div>
            <label htmlFor="deed_number" className="label">رقم الصك <span className="font-normal text-ink-soft">(إن توفر)</span></label>
            <input id="deed_number" name="deed_number" maxLength={40} className="field field-ltr num" />
          </div>
          <div>
            <label htmlFor="unit_details" className="label">رقم الوحدة والدور <span className="font-normal text-ink-soft">(اختياري)</span></label>
            <input id="unit_details" name="unit_details" maxLength={100} className="field" placeholder="مثال: شقة 4، الدور الثاني" />
          </div>
        </div>
      </Section>

      <Section title={`${other}`} hint={`هل اتفقت مع ${other}؟ نحتاج اسمه وجواله لنرسل له رابط الموافقة على العقد.`}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice name="has_other_party" value="yes" checked={hasOther === "yes"} onChange={() => setHasOther("yes")} title={`نعم، اتفقنا`} />
          <Choice name="has_other_party" value="no" checked={hasOther === "no"} onChange={() => setHasOther("no")} title="لم نتفق بعد" hint="نتواصل معك لترتيب ذلك" />
        </div>
        {hasOther === "yes" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="other_party_name" className="label">اسم {other}</label>
              <input id="other_party_name" name="other_party_name" required minLength={2} maxLength={100} className="field" />
            </div>
            <div>
              <label htmlFor="other_party_phone" className="label">جوال {other}</label>
              <input id="other_party_phone" name="other_party_phone" required pattern="05[0-9]{8}" inputMode="numeric" placeholder="05xxxxxxxx" className="field field-ltr num" />
            </div>
          </div>
        )}
      </Section>

      <Section title="القيمة والمدة">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="annual_rent" className="label">قيمة الإيجار السنوي (ريال)</label>
            <input id="annual_rent" name="annual_rent" required inputMode="numeric" className="field num" />
          </div>
          <div>
            <label htmlFor="payment_frequency" className="label">سداد الدفعات</label>
            <select id="payment_frequency" name="payment_frequency" required className="field" defaultValue="semiannual">
              <option value="monthly">شهرية</option>
              <option value="quarterly">ربع سنوية</option>
              <option value="semiannual">نصف سنوية</option>
              <option value="annual">سنوية</option>
            </select>
          </div>
          <div>
            <label htmlFor="deposit" className="label">مبلغ التأمين (ريال) <span className="font-normal text-ink-soft">(إن وجد)</span></label>
            <input id="deposit" name="deposit" inputMode="numeric" className="field num" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="start_date" className="label">تاريخ البداية</label>
              <input id="start_date" name="start_date" type="date" required defaultValue={today} className="field num" />
            </div>
            <div>
              <label htmlFor="duration_months" className="label">المدة</label>
              <select id="duration_months" name="duration_months" required className="field" defaultValue="12">
                {CONTRACT_DURATIONS.map((x) => (
                  <option key={x.months} value={x.months}>{x.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="notes" className="label">ملاحظات <span className="font-normal text-ink-soft">(اختياري)</span></label>
          <textarea id="notes" name="notes" maxLength={2000} className="field" placeholder="أي شروط اتفقتم عليها، أو وقت مناسب للتواصل" />
        </div>
      </Section>

      <div className="grid gap-3 border-t border-sand-deep pt-6">
        <p className="text-sm leading-7 text-ink-soft">
          لا نطلب رقم الهوية أو الآيبان هنا. يتحقق منها الوسيط مباشرة عند إنشاء العقد في منصة إيجار.
        </p>
        <FormMessage state={state} />
        <div>
          <SubmitButton pendingLabel="جارٍ الإرسال…">أرسل الطلب</SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
