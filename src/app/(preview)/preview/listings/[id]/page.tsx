import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RoshanMark } from "@/components/brand/Roshan";
import {
  AreaIcon,
  BathIcon,
  BedIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  CompassIcon,
  HashIcon,
  HomeIcon,
  PhoneIcon,
  PinIcon,
  RoadIcon,
  ShieldIcon,
  TagIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { BookingSection, InquirySection } from "@/components/listings/ListingEngagement";
import { ExpandableText } from "@/components/preview/ExpandableText";
import { PhotoMosaic } from "@/components/preview/PhotoMosaic";
import { ShareButton } from "@/components/preview/ShareButton";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { PROPERTY_TYPE_LABEL, PURPOSE_LABEL, RENT_PERIOD_LABEL, fieldsFor } from "@/lib/constants";
import { getLiveListing, getOfficeSettings } from "@/lib/data/public";
import { formatArea, formatNumber, formatPlainDate, whatsappLink } from "@/lib/format";
import { publicImageUrl } from "@/lib/supabase/env";
import type { Listing, OfficeSettings } from "@/lib/types";

type Params = Promise<{ id: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;
type Accent = "ref" | "brand";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const data = await getLiveListing(id);
  return {
    title: data ? `${data.listing.title} — تصميم تجريبي` : "العرض غير متاح",
    robots: { index: false, follow: false },
  };
}

export default function PreviewListingPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  return (
    <Suspense fallback={<div className="theme-air min-h-dvh flex-1" aria-hidden />}>
      <PreviewListing params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const rooms = (n: number) => (n === 1 ? "غرفة واحدة" : n === 2 ? "غرفتان" : n <= 10 ? `${formatNumber(n)} غرف` : `${formatNumber(n)} غرفة`);
const baths = (n: number) =>
  n === 1 ? "دورة مياه" : n === 2 ? "دورتا مياه" : n <= 10 ? `${formatNumber(n)} دورات مياه` : `${formatNumber(n)} دورة مياه`;

async function PreviewListing({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const accent: Accent = sp.accent === "brand" ? "brand" : "ref";
  const [data, office] = await Promise.all([getLiveListing(id), getOfficeSettings()]);
  if (!data) notFound();
  const { listing: l, images } = data;
  const urls = images.map((i) => publicImageUrl(i.storage_path)).filter((u): u is string => !!u);
  const f = fieldsFor(l.property_type);
  const here = `/preview/listings/${l.id}${accent === "brand" ? "?accent=brand" : ""}`;
  const period = l.purpose === "rent" && l.rent_period ? RENT_PERIOD_LABEL[l.rent_period] : "سعر البيع";
  const kind = `${PROPERTY_TYPE_LABEL[l.property_type]} ${PURPOSE_LABEL[l.purpose]}`;

  const meta = [
    f.rooms && l.bedrooms !== null ? rooms(l.bedrooms) : null,
    f.rooms && l.bathrooms !== null ? baths(l.bathrooms) : null,
    formatArea(l.area_sqm),
  ].filter(Boolean);

  const details: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <HomeIcon className="size-6" />, label: "نوع العقار", value: PROPERTY_TYPE_LABEL[l.property_type] },
    { icon: <TagIcon className="size-6" />, label: "الغرض", value: PURPOSE_LABEL[l.purpose] },
    { icon: <AreaIcon className="size-6" />, label: "المساحة", value: formatArea(l.area_sqm) },
  ];
  if (f.rooms && l.bedrooms !== null) details.push({ icon: <BedIcon className="size-6" />, label: "الغرف", value: formatNumber(l.bedrooms) });
  if (f.rooms && l.bathrooms !== null) details.push({ icon: <BathIcon className="size-6" />, label: "دورات المياه", value: formatNumber(l.bathrooms) });
  if (l.age_years !== null)
    details.push({ icon: <ClockIcon className="size-6" />, label: "عمر العقار", value: l.age_years === 0 ? "جديد" : `${formatNumber(l.age_years)} سنة` });
  if (l.street_width_m !== null)
    details.push({ icon: <RoadIcon className="size-6" />, label: "عرض الشارع", value: `${formatNumber(l.street_width_m)} م` });
  if (l.facade) details.push({ icon: <CompassIcon className="size-6" />, label: "الواجهة", value: l.facade });
  details.push({ icon: <HashIcon className="size-6" />, label: "رقم العرض", value: String(l.ref_no) });

  const waText = `السلام عليكم، أستفسر عن العرض رقم ${l.ref_no}: ${l.title}`;

  return (
    <div className="theme-air flex flex-1 flex-col pb-[76px] lg:pb-0" data-accent={accent === "brand" ? "brand" : undefined}>
      <PreviewBar listingId={l.id} accent={accent} />
      <Header />

      <main id="main" className="flex-1">
        <div className="mx-auto max-w-[1120px] px-4 pt-4 sm:px-6 md:pt-6 lg:px-10">
          <div className="flex flex-col">
            <div className="order-2 mt-5 md:order-1 md:mt-0 md:mb-6">
              <Link href="/listings" className="hidden items-center gap-1 text-sm text-ink-soft hover:text-ink md:inline-flex">
                <ChevronRightIcon /> كل العروض
              </Link>
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 md:mt-2">
                <h1 className="text-[1.375rem] leading-snug font-semibold sm:text-[1.625rem]">{l.title}</h1>
                <div className="-me-3 hidden md:block">
                  <ShareButton path={`/listings/${l.id}`} title={l.title} />
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <PhotoMosaic urls={urls} title={l.title} />
            </div>
          </div>

          <div className="grid gap-x-20 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="min-w-0">
              {/* نظرة سريعة */}
              <section className="pt-3 pb-8 md:pt-8 lg:pt-0">
                <h2 className="text-[1.3125rem] font-semibold">
                  {kind} في حي {l.district}، {l.city}
                </h2>
                <p className="num mt-1 text-ink">{meta.join(" · ")}</p>
              </section>

              {/* المعلن */}
              <Section>
                <div className="flex items-center gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand">
                    <RoshanMark className="h-8 w-auto" />
                  </span>
                  <div>
                    <p className="font-semibold">يعرضه {office.office_name}</p>
                    <p className="text-sm text-ink-soft">
                      {office.fal_license_number ? (
                        <>
                          وسيط عقاري مرخّص — رخصة فال <span className="num">{office.fal_license_number}</span>
                        </>
                      ) : (
                        "مكتب وساطة عقارية في جدة"
                      )}
                    </p>
                  </div>
                </div>
              </Section>

              {/* أبرز ما يميز العرض */}
              <Section>
                <ul className="grid gap-6">
                  <Highlight icon={<ShieldIcon className="size-7" />} title="إعلان مرخّص">
                    رقم ترخيص الإعلان <span className="num">{l.ad_license_number}</span>
                    {l.ad_license_expiry && <>، ساري حتى {formatPlainDate(l.ad_license_expiry)}</>}.
                  </Highlight>
                  <Highlight icon={<CalendarIcon className="size-7" />} title="احجز المعاينة بنفسك">
                    اختر اليوم والوقت من مواعيد الوسيط المتاحة، ويظهر التأكيد فوراً.
                  </Highlight>
                  {(office.phone || office.whatsapp) && (
                    <Highlight icon={<WhatsAppIcon className="size-7" />} title="تواصل مباشر">
                      اتصل بالمكتب أو راسله على واتساب.
                    </Highlight>
                  )}
                </ul>
              </Section>

              {l.description && (
                <Section title="عن العقار">
                  <ExpandableText text={l.description} />
                </Section>
              )}

              <Section title="تفاصيل العقار">
                <ul className="grid gap-x-8 sm:grid-cols-2">
                  {details.map((d) => (
                    <li key={d.label} className="flex items-center gap-4 py-3">
                      <span className="text-ink" aria-hidden>{d.icon}</span>
                      <span>
                        <span className="block text-sm text-ink-soft">{d.label}</span>
                        <span className="num block font-medium">{d.value}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>

              {l.features.length > 0 && (
                <Section title="المزايا">
                  <ul className="grid gap-x-8 sm:grid-cols-2">
                    {l.features.map((x) => (
                      <li key={x} className="flex items-center gap-4 py-3">
                        <span className="flex size-6 items-center justify-center" aria-hidden>
                          <span className="size-1.5 rounded-full bg-ink" />
                        </span>
                        {x}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {l.map_url && (
                <Section title="الموقع">
                  <p className="flex items-center gap-2">
                    <PinIcon className="size-5" /> حي {l.district}، {l.city}
                  </p>
                  <a href={l.map_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-4">
                    افتح الموقع في الخرائط
                  </a>
                </Section>
              )}

              <Section title="اسأل عن العقار" id="ask">
                <div className="grid gap-8 md:grid-cols-[16rem_minmax(0,1fr)]">
                  <HostCard office={office} />
                  <div className="min-w-0">
                    <p className="mb-4 text-sm text-ink-soft">يصلك ردّ المكتب في حسابك.</p>
                    <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-sand" />}>
                      <InquirySection listingId={l.id} returnTo={here} />
                    </Suspense>
                  </div>
                </div>
              </Section>

              <ThingsToKnow listing={l} office={office} />
            </div>

            {/* بطاقة الحجز */}
            <aside className="pb-12 lg:pb-0" aria-labelledby="book-heading">
              <div className="lg:sticky lg:top-28">
                <div id="book" className="scroll-mt-24 rounded-[14px] border border-sand-deep bg-white p-6 shadow-[var(--shadow-air)]">
                  <p>
                    <span className="num text-[1.375rem] font-semibold">{formatNumber(l.price)} ريال</span>{" "}
                    <span className="text-ink-soft">{period}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {kind} · حي {l.district}
                  </p>
                  <div className="mt-5 border-t border-sand-deep pt-5">
                    <h2 id="book-heading" className="mb-3 font-semibold">احجز معاينة</h2>
                    <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-sand" />}>
                      <BookingSection listingId={l.id} returnTo={here} />
                    </Suspense>
                  </div>
                  {(office.phone || office.whatsapp) && (
                    <>
                      <p className="mt-5 flex items-center gap-3 text-xs text-ink-soft">
                        <span className="h-px flex-1 bg-sand-deep" />
                        أو تواصل مباشرة
                        <span className="h-px flex-1 bg-sand-deep" />
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {office.phone && (
                          <a href={`tel:${office.phone}`} className="btn btn-secondary btn-sm">
                            <PhoneIcon /> اتصال
                          </a>
                        )}
                        {office.whatsapp && (
                          <a href={whatsappLink(office.whatsapp, waText)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                            <WhatsAppIcon /> واتساب
                          </a>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <p className="mt-4 text-center text-sm text-ink-soft">لا يتم أي دفع عبر الموقع.</p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />

      {/* شريط الحجز على الجوال */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-deep bg-white lg:hidden">
        <div className="mx-auto flex h-[76px] max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6">
          <p className="leading-tight">
            <span className="num block font-semibold">{formatNumber(l.price)} ريال</span>
            <span className="text-sm text-ink-soft">{period}</span>
          </p>
          <a href="#book" className="btn btn-primary">احجز معاينة</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, id, children }: { title?: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-sand-deep py-8">
      {title && <h2 className="mb-5 text-[1.3125rem] font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

function Highlight({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-5">
      <span className="mt-0.5 shrink-0 text-ink" aria-hidden>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-soft">{children}</span>
      </span>
    </li>
  );
}

function HostCard({ office }: { office: OfficeSettings }) {
  return (
    <div className="h-fit rounded-[14px] bg-white p-6 text-center shadow-[var(--shadow-air)]">
      <span className="mx-auto flex size-20 items-center justify-center overflow-hidden rounded-full bg-sand">
        <RoshanMark className="h-12 w-auto" />
      </span>
      <p className="mt-3 font-semibold">{office.office_name}</p>
      <p className="text-sm text-ink-soft">مكتب وساطة عقارية</p>
      {(office.fal_license_number || office.cr_number) && (
        <dl className="mt-4 grid gap-1 border-t border-sand-deep pt-4 text-sm">
          {office.fal_license_number && (
            <div className="flex justify-between gap-2">
              <dt className="text-ink-soft">رخصة فال</dt>
              <dd className="num font-medium">{office.fal_license_number}</dd>
            </div>
          )}
          {office.cr_number && (
            <div className="flex justify-between gap-2">
              <dt className="text-ink-soft">السجل التجاري</dt>
              <dd className="num font-medium">{office.cr_number}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

function ThingsToKnow({ listing: l, office }: { listing: Listing; office: OfficeSettings }) {
  return (
    <section className="border-t border-sand-deep py-8" aria-labelledby="know-h">
      <h2 id="know-h" className="mb-5 text-[1.3125rem] font-semibold">أمور يجب معرفتها</h2>
      <div className="grid gap-8 sm:grid-cols-3">
        <div>
          <h3 className="font-semibold">بيانات الإعلان</h3>
          <dl className="mt-2 grid gap-1 text-sm">
            <div>
              <dt className="inline text-ink-soft">رقم ترخيص الإعلان: </dt>
              <dd className="num inline font-medium">{l.ad_license_number}</dd>
            </div>
            {l.ad_license_expiry && (
              <div>
                <dt className="inline text-ink-soft">ينتهي الترخيص: </dt>
                <dd className="num inline">{formatPlainDate(l.ad_license_expiry)}</dd>
              </div>
            )}
            <div>
              <dt className="inline text-ink-soft">المعلن: </dt>
              <dd className="inline">{office.office_name}</dd>
            </div>
            {office.fal_license_number && (
              <div>
                <dt className="inline text-ink-soft">رخصة فال: </dt>
                <dd className="num inline">{office.fal_license_number}</dd>
              </div>
            )}
          </dl>
        </div>
        <div>
          <h3 className="font-semibold">المعاينة</h3>
          <ul className="mt-2 grid gap-1 text-sm text-ink-soft">
            <li>تُحجز المواعيد قبل ساعتين على الأقل، وحتى 30 يوماً مقدماً.</li>
            <li>موعد واحد قائم لكل عقار، ويمكنك إلغاؤه من حسابك.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">التواصل</h3>
          <ul className="mt-2 grid gap-1 text-sm">
            {office.phone && (
              <li>
                <span className="text-ink-soft">الهاتف: </span>
                <a href={`tel:${office.phone}`} className="num underline underline-offset-2" dir="ltr">{office.phone}</a>
              </li>
            )}
            {office.whatsapp && (
              <li>
                <a href={whatsappLink(office.whatsapp)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  راسلنا على واتساب
                </a>
              </li>
            )}
            <li>
              <Link href="/complaints" className="underline underline-offset-2">الشكاوى والملاحظات</Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function PreviewBar({ listingId, accent }: { listingId: string; accent: Accent }) {
  const pill = (on: boolean) =>
    `rounded-full px-3 py-1 ${on ? "bg-white font-medium text-ink" : "text-white underline underline-offset-2 hover:bg-white/10"}`;
  return (
    <div className="bg-ink text-sm text-white">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:px-10">
        <p>
          <span className="font-medium">تصميم تجريبي</span>
          <span className="text-white/75"> — رابط خاص، لا يظهر للزوار</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
          <span className="text-white/75">اللون:</span>
          <Link href={`/preview/listings/${listingId}`} className={pill(accent === "ref")} aria-current={accent === "ref" ? "page" : undefined}>
            المرجعي
          </Link>
          <Link
            href={`/preview/listings/${listingId}?accent=brand`}
            className={pill(accent === "brand")}
            aria-current={accent === "brand" ? "page" : undefined}
          >
            لون المكتب
          </Link>
          <span className="mx-1 h-4 w-px bg-white/30" aria-hidden />
          <Link href={`/listings/${listingId}`} className="underline underline-offset-2">
            قارن بالتصميم الحالي
          </Link>
        </div>
      </div>
    </div>
  );
}
