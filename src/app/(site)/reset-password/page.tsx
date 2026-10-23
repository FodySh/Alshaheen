import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "كلمة مرور جديدة" };

export default function ResetPage() {
  return (
    <AuthShell title="كلمة مرور جديدة">
      <ResetForm />
    </AuthShell>
  );
}
