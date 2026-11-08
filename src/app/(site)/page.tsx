import Link from "next/link";
import { Roshan } from "@/components/brand/Roshan";
import { ListingCard } from "@/components/listings/ListingCard";
import { QuickSearch } from "@/components/listings/SearchFields";
import { TypeStrip } from "@/components/listings/TypeStrip";
import { getDistricts, getLiveListings } from "@/lib/data/public";

const STEPS = [
  { title: "ترفع طلب التسويق", body: "بيانات العقار ورقم الصك والصور، من حسابك على المنصة. الطلب لا يظهر لأحد غير المكتب." },
  { title: "نراجع ونتحقق", body: "يتولى وسيط من الفريق طلبك، يتحقق من الصك ويتواصل معك لتسعير العقار ومعاينته." },
  { title: "نستخرج ترخيص الإعلان", body: "نصدر ترخيص الإعلان العقاري من الهيئة العامة للعقار باسم المكتب قبل أي نشر." },
  { title: "ننشر ونتابع", body: "يُنشر العرض وتصلك حالة الطلب أولاً بأول، ونستقبل الاستفسارات ونرتب المعاينات." },
];

/** تأخير التتابع لحركات الدخول (globals.css) */
const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;

const WRAP = "mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10";

export default async function HomePage() {
  const [{ items }, districts] = await Promise.all([getLiveListings({ page: 1 }), getDistricts()]);
  const latest = items.slice(0, 8);

  return (
    <>
      {/* الواجهة: عنوان وبحث كبسولي، وثلاثة رواشين */}
      <section className="border-b border-sand-deep">
        <div className={`${WRAP} grid items-end gap-10 pt-10 pb-8 md:grid-cols-12 md:pt-14 md:pb-0`}>
          <div className="md:col-span-7 md:pb-14">
            <h1 className="text-[2rem] leading-[1.3] font-semibold text-ink sm:text-[2.75rem] sm:leading-[1.25]">
              <span className="motion-line -my-1 block overflow-hidden py-1" style={stagger(0)}>
                <span>عقارات جدة،</span>
              </span>
              <span className="motion-line -my-1 block overflow-hidden py-1" style={stagger(1)}>
                <span>بإدارة تعرف أحياءها</span>
              </span>
            </h1>
            <p style={stagger(1)} className="motion-rise mt-4 max-w-xl text-lg leading-8 text-ink-soft">
              شقق وفلل وأراضٍ ومحلات وعمائر للبيع والإيجار، كل عرض منشور بترخيص إعلان ساري. احجز موعد المعاينة مباشرة من صفحة العقار.
            </p>
            <div style={stagger(2)} className="motion-rise mt-8 max-w-3xl">
              <QuickSearch districts={districts} />
            </div>
            <p style={stagger(3)} className="motion-rise mt-5 text-sm text-ink-soft">
              عندك عقار تريد بيعه أو تأجيره؟{" "}
              <Link href="/submit" className="font-medium text-ink underline underline-offset-4 hover:text-olive-deep">
                اعرضه علينا
              </Link>
            </p>
          </div>
          {/* ثلاثة رواشين كواجهة بيت جداوي: الأوسط أمامي وأعلى، والجانبيان خلفه وتتابع حركتهما */}
          <div className="hidden items-end justify-center md:col-span-5 md:flex">
            <Roshan id="roshan-start" delay={250} decorative className="motion-roshan hidden h-[15.5rem] w-auto lg:block" />
            <Roshan
              id="roshan-center"
              className="motion-roshan relative z-10 h-[24rem] w-auto lg:-mx-11 lg:h-[21rem] lg:[filter:drop-shadow(6px_0_0_#fff)_drop-shadow(-6px_0_0_#fff)]"
            />
            <Roshan id="roshan-end" delay={500} decorative className="motion-roshan hidden h-[15.5rem] w-auto lg:block" />
          </div>
        </div>
      </section>

      <div className={`${WRAP} pt-6`}>
        <TypeStrip active={null} hrefFor={(t) => (t ? `/listings?type=${t}` : "/listings")} />
      </div>

      <section className={`${WRAP} pt-10`} aria-labelledby="latest-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="latest-heading" className="text-[1.375rem] font-semibold sm:text-2xl">
            أحدث العروض
          </h2>
          {latest.length > 0 && (
            <Link href="/listings" className="text-sm font-medium underline underline-offset-4 hover:text-ink-soft">
              كل العروض
            </Link>
          )}
        </div>
        {latest.length > 0 ? (
          <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {latest.map((l, i) => (
              <ListingCard key={l.id} l={l} reveal={i % 4} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[14px] border border-sand-deep bg-sand px-6 py-12 text-center">
            <p className="font-semibold">لا توجد عروض منشورة الآن</p>
            <p className="mt-2 text-sm text-ink-soft">نضيف العروض فور صدور تراخيص إعلانها. يمكنك أن تبدأ بعرض عقارك.</p>
            <Link href="/submit" className="btn btn-primary mt-5">
              اعرض عقارك
            </Link>
          </div>
        )}
      </section>

      <section className={`${WRAP} pt-20`} aria-labelledby="how-heading">
        <div className="border-t border-sand-deep pt-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <h2 id="how-heading" className="text-[1.375rem] font-semibold sm:text-2xl">
                كيف نسوّق عقارك
              </h2>
              <p className="mt-2 leading-8 text-ink-soft">
                تتابع كل خطوة من حسابك. لا يُنشر أي عرض قبل التحقق من الصك وصدور ترخيص الإعلان.
              </p>
            </div>
            <Link href="/submit" className="btn btn-primary">
              ابدأ طلب التسويق
            </Link>
          </div>
          <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} style={stagger(i)} className="motion-reveal relative">
                <span
                  className="reveal-count num flex size-10 items-center justify-center rounded-full border border-ink text-base font-semibold"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-7 text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
