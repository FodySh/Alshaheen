import { SettingsForm } from "@/components/dashboard/AdminForms";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/data/public";
import { createClient } from "@/lib/supabase/server";
import type { OfficeSettings } from "@/lib/types";

export const metadata = { title: "إعدادات المكتب" };

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("office_settings")
    .select("office_name, fal_license_number, cr_number, phone, whatsapp, email, address, about")
    .eq("id", 1)
    .maybeSingle();
  const settings = (data as OfficeSettings | null) ?? DEFAULT_SETTINGS;
  return (
    <div>
      <PageHeader title="إعدادات المكتب" lead="بيانات المكتب الظاهرة للزوار في صفحات العروض وتذييل الموقع." />
      {!settings.fal_license_number && (
        <p className="mb-4 rounded-md bg-clay-tint px-4 py-3 text-sm text-clay">
          رقم رخصة فال غير مُدخل. اللائحة تشترط ظهور رقم رخصة ممارسة النشاط في الإعلان العقاري.
        </p>
      )}
      <section className="panel p-5">
        <SettingsForm settings={settings} />
      </section>
    </div>
  );
}
