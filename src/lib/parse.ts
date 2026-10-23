/** يحوّل الأرقام العربية-الهندية إلى لاتينية ويزيل الفواصل */
export function normalizeDigits(v: unknown): string {
  if (typeof v !== "string") return "";
  return v
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/[,٬\s]/g, "")
    .trim();
}

export function optionalNumber(v: unknown): number | null {
  const s = normalizeDigits(v);
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
