import Link from "next/link";
import { ListingEditor } from "@/components/dashboard/ListingEditor";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { isAdmin, requireStaff } from "@/lib/auth";
import { riyadhToday } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "عرض جديد" };

export default async function NewListingPage() {
  const user = await requireStaff();
  const admin = isAdmin(user);
  const supabase = await createClient();
  const { data: staff } = admin
    ? await supabase.from("profiles").select("id, full_name").in("role", ["agent", "admin"]).eq("is_active", true).order("full_name")
    : { data: [] };
  return (
    <div>
      <nav className="mb-3 text-sm text-ink-soft">
        <Link href="/dashboard/listings" className="hover:underline">العروض</Link>
      </nav>
      <PageHeader title="عرض جديد" lead="احفظه كمسودة لإضافة الصور، ثم انشره بعد إدخال بيانات الترخيص." />
      <ListingEditor staff={(staff ?? []) as { id: string; full_name: string }[]} isAdmin={admin} today={riyadhToday()} currentUserId={user.id} />
    </div>
  );
}
