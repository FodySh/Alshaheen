"use client";
import { useState } from "react";
import { FACADES, JEDDAH_DISTRICTS, PROPERTY_GROUPS, PROPERTY_TYPE_LABEL, fieldsFor } from "@/lib/constants";
import type { PropertyFields, PropertyType } from "@/lib/types";

type Defaults = Partial<PropertyFields>;

export function PropertyInputs({ defaults = {}, priceName, priceLabel, priceDefault }: {
  defaults?: Defaults;
  priceName: string;
  priceLabel: string;
  priceDefault?: number;
}) {
  const [type, setType] = useState<PropertyType | "">(defaults.property_type ?? "");
  const [purpose, setPurpose] = useState<string>(defaults.purpose ?? "");
  const knownDistrict = !defaults.district || JEDDAH_DISTRICTS.includes(defaults.district);
  const [district, setDistrict] = useState(knownDistrict ? (defaults.district ?? "") : "__other");
  const f = fieldsFor(type);

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="property_type" className="label">نوع العقار</label>
          <select id="property_type" name="property_type" required className="field" value={type} onChange={(e) => setType(e.target.value as PropertyType)}>
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
        <fieldset>
          <legend className="label">الغرض</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["sale", "بيع"],
              ["rent", "إيجار"],
            ].map(([v, l]) => (
              <label key={v} className="cursor-pointer">
                <input type="radio" name="purpose" value={v} required className="peer sr-only" checked={purpose === v} onChange={() => setPurpose(v)} />
                <span className="flex min-h-11 items-center justify-center rounded-md border border-stone bg-white font-medium peer-checked:border-olive peer-checked:bg-olive-tint peer-checked:text-olive-deep peer-focus-visible:outline-2 peer-focus-visible:outline-olive">
                  {l}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="district" className="label">الحي (جدة)</label>
          <select id="district" name="district" required className="field" value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="" disabled>اختر الحي</option>
            {JEDDAH_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="__other">حي آخر…</option>
          </select>
        </div>
        {district === "__other" && (
          <div>
            <label htmlFor="district_other" className="label">اسم الحي</label>
            <input id="district_other" name="district_other" required minLength={2} maxLength={60} className="field" defaultValue={knownDistrict ? "" : defaults.district} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="area_sqm" className="label">المساحة (م²)</label>
          <input id="area_sqm" name="area_sqm" inputMode="decimal" required className="field num" defaultValue={defaults.area_sqm ?? ""} />
        </div>
        {f.rooms && (
          <>
            <div>
              <label htmlFor="bedrooms" className="label">الغرف</label>
              <input id="bedrooms" name="bedrooms" inputMode="numeric" className="field num" defaultValue={defaults.bedrooms ?? ""} />
            </div>
            <div>
              <label htmlFor="bathrooms" className="label">دورات المياه</label>
              <input id="bathrooms" name="bathrooms" inputMode="numeric" className="field num" defaultValue={defaults.bathrooms ?? ""} />
            </div>
          </>
        )}
        {f.age && (
          <div>
            <label htmlFor="age_years" className="label">عمر العقار (سنة)</label>
            <input id="age_years" name="age_years" inputMode="numeric" className="field num" placeholder="0 = جديد" defaultValue={defaults.age_years ?? ""} />
          </div>
        )}
        {f.street && (
          <div>
            <label htmlFor="street_width_m" className="label">عرض الشارع (م)</label>
            <input id="street_width_m" name="street_width_m" inputMode="decimal" className="field num" defaultValue={defaults.street_width_m ?? ""} />
          </div>
        )}
        {f.facade && (
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="facade" className="label">الواجهة</label>
            <select id="facade" name="facade" className="field" defaultValue={defaults.facade ?? ""}>
              <option value="">غير محدد</option>
              {FACADES.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={priceName} className="label">{priceLabel} (ريال)</label>
          <input id={priceName} name={priceName} inputMode="numeric" required className="field num" defaultValue={priceDefault ?? ""} />
        </div>
        {purpose === "rent" && (
          <div>
            <label htmlFor="rent_period" className="label">مدة الإيجار</label>
            <select id="rent_period" name="rent_period" required className="field" defaultValue={defaults.rent_period ?? "yearly"}>
              <option value="yearly">سنوي</option>
              <option value="monthly">شهري</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
