import Link from "next/link";
import type { ListingCardData } from "@/lib/data/public";
import { PROPERTY_TYPE_LABEL, PURPOSE_LABEL } from "@/lib/constants";
import { formatArea, formatNumber, formatPrice } from "@/lib/format";
import { publicImageUrl } from "@/lib/supabase/env";
import { AreaIcon, BathIcon, BedIcon, PinIcon } from "../icons";
import { RoshanMark } from "../brand/Roshan";

/** reveal: ترتيب البطاقة في صفها، يفعّل حركة الظهور المتتابع */
export function ListingCard({ l, reveal }: { l: ListingCardData; reveal?: number }) {
  const img = publicImageUrl(l.cover_image_path);
  return (
    <Link
      href={`/listings/${l.id}`}
      style={reveal !== undefined ? ({ "--i": reveal } as React.CSSProperties) : undefined}
      className={`listing-card group flex flex-col overflow-hidden rounded-lg border border-sand-deep bg-white hover:border-stone focus-visible:outline-offset-4 ${reveal !== undefined ? "motion-reveal" : ""}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy" className="card-media size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <RoshanMark className="card-mark h-14 w-auto" />
          </div>
        )}
        <span className="card-tag absolute start-3 top-3 rounded bg-paper px-2 py-0.5 text-xs font-semibold text-ink">
          {PURPOSE_LABEL[l.purpose]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="num text-lg font-bold text-olive-deep">{formatPrice(l.price, l.rent_period)}</p>
        <h3 className="line-clamp-2 font-semibold leading-7">
          <span className="card-title">{l.title}</span>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-ink-soft">
          <PinIcon className="size-4 shrink-0" />
          {l.district}
          <span className="text-stone" aria-hidden>|</span>
          {PROPERTY_TYPE_LABEL[l.property_type]}
        </p>
        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-sand pt-3 text-sm text-ink-soft">
          {l.bedrooms !== null && (
            <li className="flex items-center gap-1.5">
              <BedIcon /> <span className="num">{formatNumber(l.bedrooms)}</span> غرف
            </li>
          )}
          {l.bathrooms !== null && (
            <li className="flex items-center gap-1.5">
              <BathIcon /> <span className="num">{formatNumber(l.bathrooms)}</span> دورات مياه
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <AreaIcon /> <span className="num">{formatArea(l.area_sqm)}</span>
          </li>
        </ul>
      </div>
    </Link>
  );
}
