import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListingCard } from "@/components/listings/ListingCard";
import { SearchPill } from "@/components/listings/SearchFields";
import { TypeStrip } from "@/components/listings/TypeStrip";
import { SlidersIcon } from "@/components/icons";
import { PROPERTY_TYPES } from "@/lib/constants";
import { getLiveDistricts, getLiveListings, PAGE_SIZE, type ListingFilters } from "@/lib/data/public";
import type { PropertyType } from "@/lib/types";

export const metadata: Metadata = {
  title: "العروض",
  description: "عقارات للبيع والإيجار في جدة بتراخيص إعلان سارية.",
};

type SP = Promise<Record<string, string | string[] | undefined>>;

function parse(sp: Record<string, string | string[] | undefined>): ListingFilters {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const n = (k: string) => {
    const v = Number(s(k).replace(/[,٬\s]/g, ""));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  const type = s("type");
  const purpose = s("purpose");
  const sort = s("sort");
  return {
    type: PROPERTY_TYPES.includes(type as PropertyType) ? (type as PropertyType) : undefined,
    purpose: purpose === "sale" || purpose === "rent" ? purpose : undefined,
    district: s("district") || undefined,
    minPrice: n("min_price"),
    maxPrice: n("max_price"),
    minArea: n("min_area"),
    bedrooms: n("bedrooms"),
    sort: sort === "price_asc" || sort === "price_desc" ? sort : "newest",
    page: n("page") ?? 1,
  };
}

const WRAP = "mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10";

export default function ListingsPage({ searchParams }: { searchParams: SP }) {
  return (
    <div className={`${WRAP} pt-6 pb-4 md:pt-8`}>
      <h1 className="sr-only">العروض</h1>
      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const f = parse(sp);
  const [{ items, total }, districts] = await Promise.all([getLiveListings(f), getLiveDistricts()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page ?? 1, pages);

  const hrefWith = (over: Record<string, string | null>) => {
    const q = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => typeof v === "string" && v && k !== "page" && q.set(k, v));
    Object.entries(over).forEach(([k, v]) => (v ? q.set(k, v) : q.delete(k)));
    const s = q.toString();
    return `/listings${s ? `?${s}` : ""}`;
  };
  const pageHref = (p: number) => hrefWith({ page: p > 1 ? String(p) : null });

  const hasFilters = Boolean(f.type || f.purpose || f.district || f.minPrice || f.maxPrice || f.minArea || f.bedrooms);
  const advanced = [f.minPrice || f.maxPrice, f.minArea, f.bedrooms, f.sort !== "newest"].filter(Boolean).length;

  return (
    <>
      <form action="/listings" aria-label="ابحث وصفِّ العروض" className="mx-auto max-w-4xl">
        <SearchPill values={{ purpose: f.purpose, type: f.type, district: f.district }} districts={districts.length ? districts : undefined} />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <details className="group relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-sand-deep bg-white px-4 py-2 text-sm font-medium hover:border-ink [&::-webkit-details-marker]:hidden">
              <SlidersIcon />
              تصفية متقدمة
              {advanced > 0 && (
                <span className="num flex size-5 items-center justify-center rounded-full bg-ink text-xs text-white">{advanced}</span>
              )}
            </summary>
            <div className="absolute left-1/2 z-20 mt-2 grid w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 gap-4 rounded-[14px] border border-sand-deep bg-white p-5 shadow-[var(--shadow-air)]">
              <fieldset>
                <legend className="label">السعر (ريال)</legend>
                <div className="grid grid-cols-2 gap-2">
                  <input name="min_price" inputMode="numeric" placeholder="من" defaultValue={f.minPrice ?? ""} className="field num" aria-label="أقل سعر" />
                  <input name="max_price" inputMode="numeric" placeholder="إلى" defaultValue={f.maxPrice ?? ""} className="field num" aria-label="أعلى سعر" />
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="f-area" className="label">مساحة من</label>
                  <input id="f-area" name="min_area" inputMode="numeric" placeholder="م²" defaultValue={f.minArea ?? ""} className="field num" />
                </div>
                <div>
                  <label htmlFor="f-bed" className="label">غرف من</label>
                  <select id="f-bed" name="bedrooms" defaultValue={f.bedrooms ?? ""} className="field">
                    <option value="">أي عدد</option>
                    {[1, 2, 3, 4, 5, 6].map((b) => (
                      <option key={b} value={b}>{b}+</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="f-sort" className="label">الترتيب</label>
                <select id="f-sort" name="sort" defaultValue={f.sort} className="field">
                  <option value="newest">الأحدث</option>
                  <option value="price_asc">السعر: الأقل أولاً</option>
                  <option value="price_desc">السعر: الأعلى أولاً</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit">اعرض النتائج</button>
            </div>
          </details>
          {hasFilters && (
            <Link href="/listings" className="rounded-full px-4 py-2 text-sm font-medium underline underline-offset-4 hover:bg-sand">
              مسح التصفية
            </Link>
          )}
        </div>
      </form>

      <div className="mt-8 border-b border-sand-deep">
        <TypeStrip active={f.type ?? "all"} hrefFor={(t) => hrefWith({ type: t })} />
      </div>

      <section aria-live="polite" className="pt-6">
        <p className="text-sm text-ink-soft">
          {total > 0 ? (
            <>
              <span className="num font-semibold text-ink">{total}</span> عرض بترخيص إعلان ساري
            </>
          ) : null}
        </p>
        {items.length > 0 ? (
          <div className="mt-4 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[14px] border border-sand-deep bg-sand px-6 py-14 text-center">
            <p className="font-semibold">{hasFilters ? "لا توجد عروض تطابق هذه التصفية" : "لا توجد عروض منشورة الآن"}</p>
            <p className="mt-2 text-sm text-ink-soft">
              {hasFilters ? "وسّع نطاق السعر أو اختر حياً آخر." : "تابعنا قريباً، أو تواصل مع المكتب لما تبحث عنه."}
            </p>
            {hasFilters && <Link href="/listings" className="btn btn-secondary mt-5">اعرض كل العروض</Link>}
          </div>
        )}
        {pages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-2" aria-label="الصفحات">
            {page > 1 && <Link href={pageHref(page - 1)} className="btn btn-secondary btn-sm">السابق</Link>}
            <span className="num px-3 text-sm text-ink-soft">صفحة {page} من {pages}</span>
            {page < pages && <Link href={pageHref(page + 1)} className="btn btn-secondary btn-sm">التالي</Link>}
          </nav>
        )}
      </section>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-hidden>
      <div className="mx-auto h-[68px] max-w-4xl animate-pulse rounded-full bg-sand" />
      <div className="mt-24 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[20/19] animate-pulse rounded-[14px] bg-sand" />
        ))}
      </div>
    </div>
  );
}
