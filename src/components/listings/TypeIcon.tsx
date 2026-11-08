import type { PropertyType } from "@/lib/types";

/** أيقونة خطية لكل نوع عقار (شريط الأنواع) */
const PATHS: Record<PropertyType | "all", React.ReactNode> = {
  all: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </>
  ),
  apartment: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M11 21v-3h2v3" />
    </>
  ),
  villa: (
    <>
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  floor: (
    <>
      <path d="m12 4 8 4-8 4-8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </>
  ),
  duplex: (
    <>
      <path d="M4 10 12 4l8 6" />
      <path d="M6 9v11h12V9" />
      <path d="M6 14.5h12M9 11.5h2M13 11.5h2M11 20v-3h2v3" />
    </>
  ),
  townhouse: (
    <>
      <path d="M2 20v-9l5-4 5 4 5-4 5 4v9Z" />
      <path d="M7 20v-4M17 20v-4M12 11v9" />
    </>
  ),
  land: (
    <>
      <path d="m3 18 5-3 5 3 8-4" />
      <path d="M3 21h18" />
      <path d="M12 13V4l5 2.5-5 2.5" />
    </>
  ),
  shop: (
    <>
      <path d="M4 9v11h16V9" />
      <path d="M3 4h18l-1 5H4Z" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  office: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" />
    </>
  ),
  showroom: (
    <>
      <path d="M3 20V8l9-4 9 4v12Z" />
      <path d="M7 20v-8h10v8M12 12v8" />
    </>
  ),
  warehouse: (
    <>
      <path d="M3 20V9l9-5 9 5v11" />
      <path d="M7 20v-7h10v7M7 16.5h10" />
    </>
  ),
  building: (
    <>
      <rect x="6" y="2.5" width="12" height="18.5" rx="1" />
      <path d="M10 6.5h1M13 6.5h1M10 10.5h1M13 10.5h1M10 14.5h1M13 14.5h1M3 21h18" />
    </>
  ),
  compound: (
    <>
      <path d="M2.5 21v-7l3.5-3 3.5 3v7M14.5 21v-7l3.5-3 3.5 3v7" />
      <path d="M8 21v-9.5l4-3.5 4 3.5V21" />
      <path d="M1 21h22" />
    </>
  ),
};

export function TypeIcon({ type, className = "size-6" }: { type: PropertyType | "all"; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[type]}
    </svg>
  );
}
