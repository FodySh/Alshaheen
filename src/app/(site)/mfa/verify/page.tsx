import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { MfaVerifyForm } from "@/components/auth/MfaForms";
import { requireSignedIn, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "رمز التحقق", robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function MfaVerifyPage({ searchParams }: { searchParams: SP }) {
  return (
    <AuthShell title="رمز التحقق" lead="افتح تطبيق المصادقة واكتب الرمز الظاهر لحساب الشاهين.">
      <Suspense fallback={<div className="h-48" />}>
        <Verify searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Verify({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const user = await requireSignedIn("/mfa/verify");
  const next = safeNext(sp.next);
  if (user.mfa !== "verify") redirect(next);
  return (
    <div className="grid gap-5">
      <MfaVerifyForm next={next} />
      <form action="/auth/signout" method="post" className="border-t border-sand-deep pt-4 text-center text-sm">
        <span className="text-ink-soft">لا تصل إلى التطبيق؟ تواصل مع المكتب لإعادة ضبطه. </span>
        <button type="submit" className="text-olive-deep hover:underline">تسجيل الخروج</button>
      </form>
    </div>
  );
}
