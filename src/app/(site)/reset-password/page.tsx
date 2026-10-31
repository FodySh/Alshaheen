import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/AuthForms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "كلمة مرور جديدة", robots: { index: false } };

export default function ResetPage() {
  return (
    <AuthShell title="كلمة مرور جديدة">
      <Suspense fallback={<div className="h-48" />}>
        <Gate />
      </Suspense>
    </AuthShell>
  );
}

/** الرابط من البريد يفتح جلسة؛ ومن فعّل المصادقة بخطوتين يُدخل الرمز قبل تغيير كلمة المرور */
async function Gate() {
  await requireUser("/reset-password");
  return <ResetForm />;
}
