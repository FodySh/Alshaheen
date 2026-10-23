import type { Metadata } from "next";
import { getOfficeSettings } from "@/lib/data/public";

export const metadata: Metadata = { title: "سياسة الخصوصية" };

export default async function PrivacyPage() {
  const s = await getOfficeSettings();
  return (
    <article className="mx-auto max-w-prose px-4 py-10 leading-8">
      <h1 className="font-display text-3xl font-bold">سياسة الخصوصية</h1>
      <p className="mt-4 text-ink-soft">
        توضح هذه السياسة كيف يجمع {s.office_name} بياناتك ويستخدمها ويحميها عند استخدام المنصة.
      </p>
      <h2 className="mt-8 text-lg font-bold">البيانات التي نجمعها</h2>
      <ul className="mt-2 list-disc ps-6">
        <li>الاسم ورقم الجوال والبريد الإلكتروني عند إنشاء الحساب.</li>
        <li>بيانات العقار ورقم الصك والمستندات والصور التي ترفعها في طلب التسويق.</li>
        <li>الاستفسارات ومواعيد المعاينة والشكاوى.</li>
      </ul>
      <h2 className="mt-8 text-lg font-bold">لماذا نستخدمها</h2>
      <ul className="mt-2 list-disc ps-6">
        <li>للتواصل معك بخصوص طلباتك واستفساراتك ومواعيدك.</li>
        <li>لاستخراج ترخيص الإعلان العقاري من الهيئة العامة للعقار وتسويق عقارك.</li>
        <li>للالتزام بالأنظمة واللوائح المعمول بها في المملكة.</li>
      </ul>
      <h2 className="mt-8 text-lg font-bold">من يطّلع عليها</h2>
      <p className="mt-2">
        موظفو المكتب المختصون فقط. مستندات طلب التسويق محفوظة في تخزين خاص لا يصل إليه إلا مقدم الطلب والوسيط المسؤول ومدير المكتب. لا نبيع بياناتك لأي جهة، ونشاركها مع الجهات الحكومية عند طلبها نظاماً.
      </p>
      <h2 className="mt-8 text-lg font-bold">حقوقك</h2>
      <p className="mt-2">
        يحق لك الاطلاع على بياناتك وتصحيحها وطلب حذفها. تعدّل الاسم والجوال من صفحة حسابك، ولأي طلب آخر تواصل معنا
        {s.email ? <> على <a href={`mailto:${s.email}`} className="text-olive-deep underline">{s.email}</a></> : null}
        {s.phone ? <> أو على الرقم <span className="num" dir="ltr">{s.phone}</span></> : null}.
      </p>
    </article>
  );
}
