import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListingCard } from "@/components/listings/ListingCard";
import { DistrictSelect, TypeSelect } from "@/components/listings/SearchFields";
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

export default function ListingsPage({ searchParams }: { searchParams: SP }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">العروض</h1>
      <p className="mt-2 text-ink-soft">كل العروض المنشورة لها ترخيص إعلان ساري من الهيئة العامة للعقار.</p>
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

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => typeof v === "string" && v && k !== "page" && q.set(k, v));
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/listings${s ? `?${s}` : ""}`;
  };

  const hasFilters = Boolean(f.type || f.purpose || f.district || f.minPrice || f.maxPrice || f.minArea || f.bedrooms);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[17rem_1fr]">
      <form action="/listings" className="panel grid h-fit gap-4 p-4 lg:sticky lg:top-24" aria-label="تصفية العروض">
        <div>
          <label htmlFor="f-purpose" className="label">الغرض</label>
          <select id="f-purpose" name="purpose" defaultValue={f.purpose ?? ""} className="field">
            <option value="">بيع أو إيجار</option>
            <option value="sale">للبيع</option>
            <option value="rent">للإيجار</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-type" className="label">نوع العقار</label>
          <TypeSelect id="f-type" value={f.type} />
        </div>
        <div>
          <label htmlFor="f-district" className="label">الحي</label>
          <DistrictSelect id="f-district" value={f.district} districts={districts.length ? districts : undefined} />
        </div>
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
        {hasFilters && (
          <Link href="/listings" className="btn btn-quiet">مسح التصفية</Link>
        )}
      </form>

      <section aria-live="polite">
        <p className="text-sm text-ink-soft">
          {total > 0 ? <><span className="num font-semibold text-ink">{total}</span> عرض</> : null}
        </p>
        {items.length > 0 ? (
          <div className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-stone bg-white px-6 py-14 text-center">
            <p className="font-semibold">{hasFilters ? "لا توجد عروض تطابق هذه التصفية" : "لا توجد عروض منشورة الآن"}</p>
            <p className="mt-2 text-sm text-ink-soft">
              {hasFilters ? "وسّع نطاق السعر أو اختر حياً آخر." : "تابعنا قريباً، أو تواصل مع المكتب لما تبحث عنه."}
            </p>
            {hasFilters && <Link href="/listings" className="btn btn-secondary mt-5">اعرض كل العروض</Link>}
          </div>
        )}
        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label="الصفحات">
            {page > 1 && <Link href={pageHref(page - 1)} className="btn btn-secondary btn-sm">السابق</Link>}
            <span className="num px-3 text-sm text-ink-soft">صفحة {page} من {pages}</span>
            {page < pages && <Link href={pageHref(page + 1)} className="btn btn-secondary btn-sm">التالي</Link>}
          </nav>
        )}
      </section>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[17rem_1fr]" aria-hidden>
      <div className="panel h-96 animate-pulse bg-sand/40" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-lg bg-sand/60" />
        ))}
      </div>
    </div>
  );
}
