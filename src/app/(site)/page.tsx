import Link from "next/link";
import { Roshan } from "@/components/brand/Roshan";
import { ListingCard } from "@/components/listings/ListingCard";
import { QuickSearch } from "@/components/listings/SearchFields";
import { getDistricts, getLiveListings } from "@/lib/data/public";

const STEPS = [
  { title: "ترفع طلب التسويق", body: "بيانات العقار ورقم الصك والصور، من حسابك على المنصة. الطلب لا يظهر لأحد غير المكتب." },
  { title: "نراجع ونتحقق", body: "يتولى وسيط من الفريق طلبك، يتحقق من الصك ويتواصل معك لتسعير العقار ومعاينته." },
  { title: "نستخرج ترخيص الإعلان", body: "نصدر ترخيص الإعلان العقاري من الهيئة العامة للعقار باسم المكتب قبل أي نشر." },
  { title: "ننشر ونتابع", body: "يُنشر العرض وتصلك حالة الطلب أولاً بأول، ونستقبل الاستفسارات ونرتب المعاينات." },
];

/** تأخير التتابع لحركات الدخول (globals.css) */
const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default async function HomePage() {
  const [{ items }, districts] = await Promise.all([getLiveListings({ page: 1 }), getDistricts()]);
  const latest = items.slice(0, 6);

  return (
    <>
      {/* الواجهة: جدار حجر منقبي بأحزمة خشبية، وروشان */}
      <section className="relative overflow-hidden border-b border-sand-deep bg-sand">
        <div
          aria-hidden
          className="motion-stone absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0, transparent 63px, var(--color-sand-deep) 63px, var(--color-sand-deep) 64px)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-end gap-10 px-4 pt-12 pb-10 md:grid-cols-12 md:pt-16 md:pb-0">
          <div className="md:col-span-7 md:pb-16">
            <h1 className="font-display text-[2.4rem] leading-[1.25] font-bold text-ink sm:text-5xl sm:leading-[1.2]">
              <span className="motion-line -my-1 block overflow-hidden py-1" style={stagger(0)}>
                <span>عقارات جدة،</span>
              </span>
              <span className="motion-line -my-1 block overflow-hidden py-1" style={stagger(1)}>
                <span>بإدارة تعرف أحياءها</span>
              </span>
            </h1>
            <p style={stagger(1)} className="motion-rise mt-5 max-w-xl text-lg leading-8 text-ink-soft">
              شقق وفلل وأراضٍ ومحلات وعمائر للبيع والإيجار، كل عرض منشور بترخيص إعلان ساري. احجز موعد المعاينة مباشرة من صفحة العقار.
            </p>
            <div style={stagger(2)} className="motion-rise mt-8 max-w-3xl">
              <QuickSearch districts={districts} />
            </div>
            <p style={stagger(3)} className="motion-rise mt-5 text-sm text-ink-soft">
              عندك عقار تريد بيعه أو تأجيره؟{" "}
              <Link href="/submit" className="font-semibold text-olive-deep underline decoration-olive/40 underline-offset-4 hover:decoration-olive">
                اعرضه علينا
              </Link>
            </p>
          </div>
          {/* ثلاثة رواشين كواجهة بيت جداوي: الأوسط أمامي وأعلى بحافة رملية تفصله، والجانبيان خلفه وتتابع حركتهما */}
          <div className="hidden items-end justify-center md:col-span-5 md:flex">
            <Roshan id="roshan-start" delay={250} decorative className="motion-roshan hidden h-[15.5rem] w-auto lg:block" />
            <Roshan
              id="roshan-center"
              className="motion-roshan relative z-10 h-[24rem] w-auto drop-shadow-[0_18px_0_rgba(43,33,24,0.08)] lg:-mx-11 lg:h-[21rem] lg:[filter:drop-shadow(6px_0_0_var(--color-sand))_drop-shadow(-6px_0_0_var(--color-sand))_drop-shadow(0_18px_0_rgba(43,33,24,0.08))]"
            />
            <Roshan id="roshan-end" delay={500} decorative className="motion-roshan hidden h-[15.5rem] w-auto lg:block" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14" aria-labelledby="latest-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="latest-heading" className="font-display text-2xl font-bold sm:text-3xl">
            أحدث العروض
          </h2>
          {latest.length > 0 && (
            <Link href="/listings" className="text-sm font-semibold text-olive-deep hover:underline">
              كل العروض
            </Link>
          )}
        </div>
        {latest.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((l, i) => (
              <ListingCard key={l.id} l={l} reveal={i % 3} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-dashed border-stone bg-white px-6 py-12 text-center">
            <p className="font-semibold">لا توجد عروض منشورة الآن</p>
            <p className="mt-2 text-sm text-ink-soft">نضيف العروض فور صدور تراخيص إعلانها. يمكنك أن تبدأ بعرض عقارك.</p>
            <Link href="/submit" className="btn btn-primary mt-5">
              اعرض عقارك
            </Link>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="how-heading">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="how-heading" className="font-display text-2xl font-bold sm:text-3xl">
              كيف نسوّق عقارك
            </h2>
            <p className="mt-3 leading-8 text-ink-soft">
              تتابع كل خطوة من حسابك. لا يُنشر أي عرض قبل التحقق من الصك وصدور ترخيص الإعلان.
            </p>
            <Link href="/submit" className="btn btn-primary mt-6">
              ابدأ طلب التسويق
            </Link>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-lg border border-sand-deep bg-sand-deep sm:grid-cols-2 lg:col-span-8">
            {STEPS.map((s, i) => (
              <li key={s.title} style={stagger(i % 2)} className="motion-reveal relative bg-white p-6 transition-colors hover:bg-paper">
                <span aria-hidden className="reveal-bar absolute inset-x-0 top-0 h-[3px] origin-right bg-olive" style={stagger(i)} />
                <span className="reveal-count inline-block font-display text-3xl font-bold text-olive/80 num">{i + 1}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-7 text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
