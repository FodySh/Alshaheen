import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/AuthForms";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "حساب جديد" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function RegisterPage({ searchParams }: { searchParams: SP }) {
  return (
    <AuthShell title="حساب جديد" lead="بالحساب تعرض عقارك علينا، وتحجز المعاينات، وتتابع ردود المكتب.">
      <Suspense fallback={<div className="h-96" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Form({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  return <RegisterForm next={safeNext(sp.next)} />;
}
