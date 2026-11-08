import Link from "next/link";
import type { ListingCardData } from "@/lib/data/public";
import { PROPERTY_TYPE_LABEL, PURPOSE_LABEL, RENT_PERIOD_LABEL } from "@/lib/constants";
import { formatArea, formatNumber } from "@/lib/format";
import { publicImageUrl } from "@/lib/supabase/env";
import { RoshanMark } from "../brand/Roshan";

/** بطاقة عرض تقودها الصورة. reveal: ترتيب البطاقة في صفها، يفعّل حركة الظهور المتتابع */
export function ListingCard({ l, reveal }: { l: ListingCardData; reveal?: number }) {
  const img = publicImageUrl(l.cover_image_path);
  const meta = [
    l.bedrooms !== null ? `${formatNumber(l.bedrooms)} غرف` : null,
    l.bathrooms !== null ? `${formatNumber(l.bathrooms)} دورات مياه` : null,
    formatArea(l.area_sqm),
  ].filter(Boolean);
  const period = l.purpose === "rent" && l.rent_period ? RENT_PERIOD_LABEL[l.rent_period] : null;
  return (
    <Link
      href={`/listings/${l.id}`}
      style={reveal !== undefined ? ({ "--i": reveal } as React.CSSProperties) : undefined}
      className={`listing-card group block rounded-[14px] focus-visible:outline-offset-4 ${reveal !== undefined ? "motion-reveal" : ""}`}
    >
      <div className="relative aspect-[20/19] overflow-hidden rounded-[14px] bg-sand">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy" className="card-media size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <RoshanMark className="card-mark h-14 w-auto" />
          </div>
        )}
        <span className="card-tag absolute start-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink shadow-[var(--shadow-air)]">
          {PURPOSE_LABEL[l.purpose]}
        </span>
      </div>
      <div className="mt-3 text-[0.95rem] leading-6">
        <h3 className="font-semibold">
          <span className="card-title">
            {PROPERTY_TYPE_LABEL[l.property_type]} في {l.district}
          </span>
        </h3>
        <p className="line-clamp-1 text-ink-soft">{l.title}</p>
        <p className="num text-ink-soft">{meta.join(" · ")}</p>
        <p className="mt-1.5">
          <span className="num font-semibold">{formatNumber(l.price)} ريال</span>
          {period && <span className="text-ink-soft"> {period}</span>}
        </p>
      </div>
    </Link>
  );
}
