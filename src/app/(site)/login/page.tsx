import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";
import { safeNext } from "@/lib/auth";

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
  const sp = await searchParams;
  const notice = sp.error === "link" ? "الرابط غير صالح أو انتهت صلاحيته. سجّل الدخول أو اطلب رابطاً جديداً." : undefined;
  return <LoginForm next={safeNext(sp.next)} notice={notice} />;
}
