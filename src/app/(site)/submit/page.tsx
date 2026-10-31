import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SubmitRequestForm } from "@/components/forms/SubmitRequestForm";
import { getViewer } from "@/lib/auth";
import { getDistricts } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "اعرض عقارك",
  description: "اعرض عقارك في جدة للبيع أو الإيجار عبر الشاهين لإدارة الأملاك.",
};

const STEPS = ["ترفع الطلب", "نراجع ونتحقق من الصك", "نستخرج ترخيص الإعلان", "ننشر العرض ونتابع"];

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">اعرض عقارك علينا</h1>
          <p className="mt-3 max-w-2xl leading-8 text-ink-soft">
            طلب التسويق خاص بينك وبين المكتب ولا يظهر للزوار. بعد المراجعة نستخرج ترخيص الإعلان باسم المكتب وننشر العرض.
          </p>
          <div className="panel mt-8 p-5 sm:p-8">
            <Suspense fallback={<div className="h-96 animate-pulse rounded bg-sand/50" />}>
              <Gate />
            </Suspense>
          </div>
        </div>
        <aside className="h-fit lg:sticky lg:top-24">
          <h2 className="font-semibold">مراحل الطلب</h2>
          <ol className="mt-4 grid gap-0">
            {STEPS.map((s, i) => (
              <li key={s} className="relative flex gap-3 pb-6 last:pb-0">
                {i < STEPS.length - 1 && <span aria-hidden className="absolute start-[0.9rem] top-8 h-[calc(100%-2rem)] w-px bg-stone" />}
                <span className="num flex size-7 shrink-0 items-center justify-center rounded-full border border-olive text-sm font-semibold text-olive-deep">
                  {i + 1}
                </span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm leading-7 text-ink-soft">تتابع حالة الطلب من حسابك، ويصلك بريد عند كل تغيير.</p>
        </aside>
      </div>
    </div>
  );
}

async function Gate() {
  const user = await getViewer();
  if (!user)
    return (
      <div className="py-6 text-center">
        <p className="font-semibold">سجّل الدخول لتقديم الطلب</p>
        <p className="mt-2 text-sm text-ink-soft">نحتاج حساباً لنبلغك بحالة طلبك ونتواصل معك.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/login?next=/submit" className="btn btn-primary">دخول</Link>
          <Link href="/register?next=/submit" className="btn btn-secondary">حساب جديد</Link>
        </div>
      </div>
    );
  return <SubmitRequestForm userId={user.id} districts={await getDistricts()} />;
}
