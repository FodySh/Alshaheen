import { z } from "zod";
import { FACADES, PROPERTY_TYPES, fieldsFor } from "./constants";
import { optionalNumber, str } from "./parse";
import type { PropertyType } from "./types";

const intRange = (label: string, min: number, max: number) =>
  z
    .number({ message: `${label}: اكتب رقماً.` })
    .int(`${label}: رقم صحيح بدون كسور.`)
    .min(min, `${label}: الحد الأدنى ${min}.`)
    .max(max, `${label}: الحد الأعلى ${max}.`)
    .nullable();

/** الحقول المشتركة بين طلب التسويق والعرض */
export const propertySchema = z
  .object({
    property_type: z.enum(PROPERTY_TYPES as [PropertyType, ...PropertyType[]], { message: "اختر نوع العقار." }),
    purpose: z.enum(["sale", "rent"], { message: "اختر الغرض: بيع أو إيجار." }),
    district: z.string().trim().min(2, "اختر الحي.").max(60),
    area_sqm: z.number({ message: "اكتب المساحة بالأرقام." }).positive("المساحة يجب أن تكون أكبر من صفر.").max(10_000_000),
    bedrooms: intRange("الغرف", 0, 50),
    bathrooms: intRange("دورات المياه", 0, 50),
    age_years: intRange("عمر العقار", 0, 100),
    street_width_m: z.number({ message: "عرض الشارع: اكتب رقماً." }).positive("عرض الشارع أكبر من صفر.").max(200).nullable(),
    facade: z.union([z.enum(FACADES as [string, ...string[]]), z.null()]),
    rent_period: z.enum(["yearly", "monthly"]).nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.purpose === "rent" && !v.rent_period)
      ctx.addIssue({ code: "custom", path: ["rent_period"], message: "اختر مدة الإيجار: سنوي أو شهري." });
  })
  .transform((v) => {
    const f = fieldsFor(v.property_type);
    return {
      ...v,
      bedrooms: f.rooms ? v.bedrooms : null,
      bathrooms: f.rooms ? v.bathrooms : null,
      age_years: f.age ? v.age_years : null,
      street_width_m: f.street ? v.street_width_m : null,
      facade: f.facade ? v.facade : null,
      rent_period: v.purpose === "rent" ? v.rent_period : null,
    };
  });

export function propertyInput(fd: FormData) {
  const districtChoice = str(fd.get("district"));
  const district = districtChoice === "__other" ? str(fd.get("district_other")) : districtChoice;
  return {
    property_type: str(fd.get("property_type")) || undefined,
    purpose: str(fd.get("purpose")) || undefined,
    district,
    area_sqm: optionalNumber(fd.get("area_sqm")) ?? undefined,
    bedrooms: optionalNumber(fd.get("bedrooms")),
    bathrooms: optionalNumber(fd.get("bathrooms")),
    age_years: optionalNumber(fd.get("age_years")),
    street_width_m: optionalNumber(fd.get("street_width_m")),
    facade: str(fd.get("facade")) || null,
    rent_period: str(fd.get("rent_period")) || null,
  };
}

export const priceSchema = (label: string) =>
  z.number({ message: `${label}: اكتب المبلغ بالأرقام.` }).positive(`${label} يجب أن يكون أكبر من صفر.`).max(10_000_000_000);

export function firstIssue(e: z.ZodError) {
  return e.issues[0]?.message ?? "راجع الحقول المطلوبة.";
}
