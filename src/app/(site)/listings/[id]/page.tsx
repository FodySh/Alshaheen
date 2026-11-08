import type { Metadata } from "next";
import Link from "next/link";
import { FactList } from "@/components/FactList";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/listings/Gallery";
import { BookingSection, InquirySection } from "@/components/listings/ListingEngagement";
import { CalendarIcon, ChatIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "@/components/icons";
import { PROPERTY_TYPE_LABEL, PURPOSE_LABEL, fieldsFor } from "@/lib/constants";
import { getLiveListing, getOfficeSettings } from "@/lib/data/public";
import { formatArea, formatNumber, formatPlainDate, formatPrice, whatsappLink } from "@/lib/format";
import { publicImageUrl } from "@/lib/supabase/env";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const data = await getLiveListing(id);
  if (!data) return { title: "العرض غير متاح" };
  const l = data.listing;
  const cover = publicImageUrl(l.cover_image_path);
  return {
    title: l.title,
    description: `${PROPERTY_TYPE_LABEL[l.property_type]} ${PURPOSE_LABEL[l.purpose]} في حي ${l.district}، جدة — ${formatPrice(l.price, l.rent_period)}`,
    openGraph: cover ? { images: [cover] } : undefined,
  };
}

export default function ListingPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ListingDetail params={params} />
    </Suspense>
  );
}

async function ListingDetail({ params }: { params: Params }) {
  const { id } = await params;
  const [data, office] = await Promise.all([getLiveListing(id), getOfficeSettings()]);
  if (!data) notFound();
  const { listing: l, images } = data;
  const urls = images.map((i) => publicImageUrl(i.storage_path)).filter((u): u is string => !!u);
  const f = fieldsFor(l.property_type);

  const facts: [string, string][] = [
    ["نوع العقار", PROPERTY_TYPE_LABEL[l.property_type]],
    ["الغرض", PURPOSE_LABEL[l.purpose]],
    ["المساحة", formatArea(l.area_sqm)],
  ];
  if (f.rooms && l.bedrooms !== null) facts.push(["الغرف", formatNumber(l.bedrooms)]);
  if (f.rooms && l.bathrooms !== null) facts.push(["دورات المياه", formatNumber(l.bathrooms)]);
  if (l.age_years !== null) facts.push(["عمر العقار", l.age_years === 0 ? "جديد" : `${formatNumber(l.age_years)} سنة`]);
  if (l.street_width_m !== null) facts.push(["عرض الشارع", `${formatNumber(l.street_width_m)} م`]);
  if (l.facade) facts.push(["الواجهة", l.facade]);
  facts.push(["رقم العرض", String(l.ref_no)]);

  const waText = `السلام عليكم، أستفسر عن العرض رقم ${l.ref_no}: ${l.title}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="مسار التنقل" className="text-sm text-ink-soft">
        <Link href="/listings" className="hover:text-ink hover:underline">العروض</Link>
        <span aria-hidden className="mx-2 text-stone">/</span>
        <Link href={`/listings?district=${encodeURIComponent(l.district)}`} className="hover:text-ink hover:underline">{l.district}</Link>
      </nav>

      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <article>
          <Gallery urls={urls} title={l.title} />

          <header className="mt-6">
            <p className="flex items-center gap-1.5 text-ink-soft">
              <PinIcon className="size-4" />
              حي {l.district}، {l.city}
            </p>
            <h1 className="mt-2 font-display text-3xl leading-snug font-bold">{l.title}</h1>
            <p className="num mt-3 text-2xl font-bold text-olive-deep">{formatPrice(l.price, l.rent_period)}</p>
          </header>

          <div className="mt-8"><FactList facts={facts} /></div>

          {l.description && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">الوصف</h2>
              <p className="mt-2 max-w-prose whitespace-pre-line leading-8 text-ink">{l.description}</p>
            </section>
          )}

          {l.features.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">المزايا</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {l.features.map((x) => (
                  <li key={x} className="rounded-md bg-sand px-3 py-1 text-sm">{x}</li>
                ))}
              </ul>
            </section>
          )}

          {l.map_url && (
            <p className="mt-8">
              <a href={l.map_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <PinIcon /> الموقع على الخريطة
              </a>
            </p>
          )}

          {/* بيانات الترخيص — إلزامية في الإعلان العقاري */}
          <section className="mt-10 rounded-lg border border-sand-deep bg-sand/50 p-5" aria-labelledby="license-heading">
            <h2 id="license-heading" className="font-semibold">بيانات الإعلان</h2>
            <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-ink-soft">رقم ترخيص الإعلان:</dt>
                <dd className="num font-bold">{l.ad_license_number}</dd>
              </div>
              {l.ad_license_expiry && (
                <div className="flex gap-2">
                  <dt className="text-ink-soft">ينتهي الترخيص:</dt>
                  <dd className="num font-medium">{formatPlainDate(l.ad_license_expiry)}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="text-ink-soft">المعلن:</dt>
                <dd className="font-medium">{office.office_name}</dd>
              </div>
              {office.fal_license_number && (
                <div className="flex gap-2">
                  <dt className="text-ink-soft">رخصة فال:</dt>
                  <dd className="num font-medium">{office.fal_license_number}</dd>
                </div>
              )}
            </dl>
          </section>
        </article>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
          <div className="panel p-5">
            <p className="font-semibold">تواصل مع المكتب</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {office.phone && (
                <a href={`tel:${office.phone}`} className="btn btn-secondary">
                  <PhoneIcon /> اتصال
                </a>
              )}
              {office.whatsapp && (
                <a href={whatsappLink(office.whatsapp, waText)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  <WhatsAppIcon /> واتساب
                </a>
              )}
            </div>
          </div>

          <section className="panel p-5" aria-labelledby="book-heading">
            <h2 id="book-heading" className="flex items-center gap-2 font-semibold">
              <CalendarIcon className="size-5 text-olive" /> احجز معاينة
            </h2>
            <div className="mt-4">
              <Suspense fallback={<div className="h-40 animate-pulse rounded bg-sand/60" />}>
                <BookingSection listingId={l.id} returnTo={`/listings/${l.id}`} />
              </Suspense>
            </div>
          </section>

          <section className="panel p-5" aria-labelledby="inq-heading">
            <h2 id="inq-heading" className="flex items-center gap-2 font-semibold">
              <ChatIcon className="size-5 text-olive" /> اسأل عن العقار
            </h2>
            <div className="mt-4">
              <Suspense fallback={<div className="h-32 animate-pulse rounded bg-sand/60" />}>
                <InquirySection listingId={l.id} returnTo={`/listings/${l.id}`} />
              </Suspense>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_22rem]" aria-hidden>
      <div className="aspect-[16/10] animate-pulse rounded-lg bg-sand/60" />
      <div className="h-96 animate-pulse rounded-lg bg-sand/60" />
    </div>
  );
}
