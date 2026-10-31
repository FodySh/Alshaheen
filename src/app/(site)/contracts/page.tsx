import type { Metadata } from "next";
import { Suspense } from "react";
import { ContractRequestForm } from "@/components/forms/ContractRequestForm";
import { getViewer } from "@/lib/auth";
import { getDistricts, getOfficeSettings } from "@/lib/data/public";
import { riyadhToday } from "@/lib/format";

export const metadata: Metadata = {
  title: "توثيق عقود الإيجار",
  description: "نوثّق عقد إيجارك السكني أو التجاري في منصة إيجار عن طريق وسيط مرخّص.",
};

const STEPS = [
  { title: "ترسل الطلب", body: "بيانات أولية عن العقار والإيجار والطرف الآخر." },
  { title: "نتواصل معك", body: "يستكمل الوسيط البيانات ويتحقق من الهويات والصك." },
  { title: "ننشئ العقد في إيجار", body: "تصل للمؤجر والمستأجر رسالة نصية للموافقة عبر نفاذ." },
  { title: "يُوثَّق العقد", body: "تجد رقم العقد وتاريخ انتهائه في حسابك، وننبهك قبل الانتهاء للتجديد." },
];

export default function ContractsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">توثيق عقود الإيجار</h1>
          <p className="mt-3 max-w-2xl leading-8 text-ink-soft">
            نوثّق عقد الإيجار السكني أو التجاري في منصة إيجار، سواء كنت المالك أو المستأجر، لعقد جديد أو تجديد عقد قائم.
          </p>
          <div className="panel mt-8 p-5 sm:p-8">
            <Suspense fallback={<div className="h-96 animate-pulse rounded bg-sand/50" />}>
              <Gate />
            </Suspense>
          </div>
        </div>
        <aside className="grid h-fit gap-8 lg:sticky lg:top-24">
          <div>
            <h2 className="font-semibold">كيف تتم الخدمة</h2>
            <ol className="mt-4 grid">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < STEPS.length - 1 && <span aria-hidden className="absolute start-[0.9rem] top-8 h-[calc(100%-2rem)] w-px bg-stone" />}
                  <span className="num flex size-7 shrink-0 items-center justify-center rounded-full border border-olive text-sm font-semibold text-olive-deep">{i + 1}</span>
                  <span>
                    <span className="block font-medium">{s.title}</span>
                    <span className="block text-sm leading-6 text-ink-soft">{s.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <Suspense fallback={null}>
            <Fee />
          </Suspense>
          <div className="text-sm leading-7 text-ink-soft">
            <p className="font-semibold text-ink">جهّز للمكالمة</p>
            <ul className="mt-1 list-disc ps-5">
              <li>هوية المؤجر والمستأجر وتاريخ الميلاد</li>
              <li>رقم الصك</li>
              <li>آيبان المؤجر</li>
              <li>السجل التجاري للعقود التجارية</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

async function Fee() {
  const s = await getOfficeSettings();
  return (
    <div className="rounded-lg border border-sand-deep bg-sand/50 p-4">
      <p className="text-sm text-ink-soft">رسوم خدمة المكتب</p>
      <p className="mt-1 font-semibold">{s.contract_service_fee || "حسب الاتفاق"}</p>
      <p className="mt-2 text-xs leading-5 text-ink-soft">لا تشمل رسوم منصة إيجار، وتُحسب حسب نوع العقد ومدته.</p>
    </div>
  );
}

async function Gate() {
  const [user, districts] = await Promise.all([getViewer(), getDistricts()]);
  return (
    <ContractRequestForm
      districts={districts}
      today={riyadhToday()}
      requester={user ? { name: user.profile.full_name, phone: user.profile.phone, email: user.email ?? "" } : undefined}
    />
  );
}
