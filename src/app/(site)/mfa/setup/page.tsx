import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { MfaSetup } from "@/components/auth/MfaForms";
import { hasStaffRole, requireSignedIn, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "المصادقة بخطوتين", robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function MfaSetupPage({ searchParams }: { searchParams: SP }) {
  return (
    <AuthShell title="المصادقة بخطوتين" lead="اربط تطبيق مصادقة على جوالك لحماية حسابك.">
      <Suspense fallback={<div className="h-64" />}>
        <Setup searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Setup({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const user = await requireSignedIn("/mfa/setup");
  const next = safeNext(sp.next, hasStaffRole(user) ? "/dashboard" : "/account#security");
  if (user.mfa === "verify") redirect(`/mfa/verify?next=${encodeURIComponent(next)}`);
  if (user.hasMfa) redirect(next);
  return <MfaSetup next={next} required={hasStaffRole(user)} />;
}
