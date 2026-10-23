import type { Metadata } from "next";
import { Suspense } from "react";
import { ComplaintForm } from "@/components/forms/ComplaintForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "الشكاوى والملاحظات" };

export default function ComplaintsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">الشكاوى والملاحظات</h1>
      <p className="mt-3 leading-8 text-ink-soft">
        اكتب شكواك أو ملاحظتك على أي عرض أو تعامل مع المكتب. تحصل على رقم للشكوى فور إرسالها، ونتواصل معك على رقم جوالك. إن كان لديك حساب فتابع حالتها من صفحة حسابك.
      </p>
      <div className="panel mt-8 p-5 sm:p-8">
        <Suspense fallback={<ComplaintForm />}>
          <Prefilled />
        </Suspense>
      </div>
    </div>
  );
}

async function Prefilled() {
  const u = await getSessionUser();
  return <ComplaintForm name={u?.profile.full_name} phone={u?.profile.phone} email={u?.email ?? ""} />;
}
