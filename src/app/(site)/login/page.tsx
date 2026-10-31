import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";
import { safeNext } from "@/lib/auth";
import { isGoogleAuthEnabled } from "@/lib/data/public";

export const metadata: Metadata = { title: "تسجيل الدخول" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function LoginPage({ searchParams }: { searchParams: SP }) {
  return (
    <AuthShell title="تسجيل الدخول" lead="تابع طلباتك واستفساراتك ومواعيد المعاينة.">
      <Suspense fallback={<div className="h-64" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Form({ searchParams }: { searchParams: SP }) {
  const [sp, google] = await Promise.all([searchParams, isGoogleAuthEnabled()]);
  const notice =
    sp.error === "link"
      ? "الرابط غير صالح أو انتهت صلاحيته. سجّل الدخول أو اطلب رابطاً جديداً."
      : sp.error === "google"
        ? "تعذّر الدخول بحساب Google. حاول مرة أخرى أو ادخل بالبريد وكلمة المرور."
      : sp.expired === "idle"
        ? "انتهت الجلسة بسبب عدم النشاط. سجّل الدخول من جديد."
        : sp.expired === "max_age"
          ? "انتهت مدة الجلسة. سجّل الدخول من جديد."
          : sp.signed_out === "all"
            ? "سُجّل خروجك من كل الأجهزة."
            : undefined;
  return <LoginForm next={safeNext(sp.next)} notice={notice} google={google} />;
}
