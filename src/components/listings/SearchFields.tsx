import { JEDDAH_DISTRICTS, PROPERTY_GROUPS, PROPERTY_TYPE_LABEL } from "@/lib/constants";

type Values = { type?: string; purpose?: string; district?: string };

export function TypeSelect({ value, id = "type", required, name = "type", emptyLabel = "كل الأنواع" }: { value?: string; id?: string; required?: boolean; name?: string; emptyLabel?: string }) {
  return (
    <select id={id} name={name} defaultValue={value ?? ""} className="field" required={required}>
      <option value="">{emptyLabel}</option>
      {PROPERTY_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.types.map((t) => (
            <option key={t} value={t}>
              {PROPERTY_TYPE_LABEL[t]}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function DistrictSelect({ value, id = "district", districts = JEDDAH_DISTRICTS, required, emptyLabel = "كل الأحياء" }: { value?: string; id?: string; districts?: string[]; required?: boolean; emptyLabel?: string }) {
  const list = value && !districts.includes(value) ? [value, ...districts] : districts;
  return (
    <select id={id} name="district" defaultValue={value ?? ""} className="field" required={required}>
      <option value="">{emptyLabel}</option>
      {list.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}

/** نموذج البحث المختصر (الصفحة الرئيسية) */
export function QuickSearch({ values = {} }: { values?: Values }) {
  return (
    <form action="/listings" className="grid gap-3 rounded-lg border border-sand-deep bg-white p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end sm:p-4">
      <div>
        <label htmlFor="q-purpose" className="label">الغرض</label>
        <select id="q-purpose" name="purpose" defaultValue={values.purpose ?? ""} className="field">
          <option value="">بيع أو إيجار</option>
          <option value="sale">للبيع</option>
          <option value="rent">للإيجار</option>
        </select>
      </div>
      <div>
        <label htmlFor="q-type" className="label">نوع العقار</label>
        <TypeSelect id="q-type" value={values.type} />
      </div>
      <div>
        <label htmlFor="q-district" className="label">الحي</label>
        <DistrictSelect id="q-district" value={values.district} />
      </div>
      <button type="submit" className="btn btn-primary sm:min-w-28">ابحث</button>
    </form>
  );
}
