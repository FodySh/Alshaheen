import Link from "next/link";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL } from "@/lib/constants";
import type { PropertyType } from "@/lib/types";
import { TypeIcon } from "./TypeIcon";

/** شريط أنواع العقار: أيقونة واسم، والمختار بخط سفلي. يُسحب أفقياً على الشاشات الصغيرة */
export function TypeStrip({
  active,
  hrefFor,
}: {
  active: PropertyType | "all" | null;
  hrefFor: (t: PropertyType | null) => string;
}) {
  const items: (PropertyType | "all")[] = ["all", ...PROPERTY_TYPES];
  return (
    <nav aria-label="أنواع العقار" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <ul className="flex min-w-max gap-7 sm:gap-9">
        {items.map((t) => {
          const on = active === t;
          return (
            <li key={t}>
              <Link
                href={hrefFor(t === "all" ? null : t)}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-1.5 border-b-2 pt-1 pb-2.5 text-xs font-medium transition-colors ${
                  on ? "border-ink text-ink" : "border-transparent text-ink-soft hover:border-sand-deep hover:text-ink"
                }`}
              >
                <TypeIcon type={t} />
                {t === "all" ? "الكل" : PROPERTY_TYPE_LABEL[t]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
