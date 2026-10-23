import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { DashNav, type NavItem } from "@/components/dashboard/DashNav";
import { isAdmin, requireStaff } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { default: "لوحة المكتب", template: "%s — لوحة المكتب" }, robots: { index: false } };

// لوحة خاصة تعتمد على الجلسة: لا حاجة لتحميل فوري مسبق
export const instant = false;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const admin = isAdmin(user);
  const supabase = await createClient();

  const reqQuery = supabase.from("marketing_requests").select("id", { count: "exact", head: true });
  const ctrQuery = supabase.from("contract_requests").select("id", { count: "exact", head: true });
  const [{ count: newRequests }, { count: newInquiries }, { count: newComplaints }, { count: openContracts }] = await Promise.all([
    admin ? reqQuery.eq("status", "new") : reqQuery.eq("assigned_to", user.id).in("status", ["under_review", "awaiting_license"]),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin
      ? supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "new")
      : Promise.resolve({ count: 0 }),
    admin ? ctrQuery.eq("status", "new") : ctrQuery.eq("assigned_to", user.id).in("status", ["new", "contacted", "awaiting_data", "sent_to_ejar"]),
  ]);

  const items: NavItem[] = [
    { href: "/dashboard", label: "نظرة عامة" },
    { href: "/dashboard/calendar", label: "التقويم" },
    { href: "/dashboard/requests", label: "طلبات التسويق", count: newRequests ?? 0 },
    { href: "/dashboard/listings", label: "العروض" },
    { href: "/dashboard/contracts", label: "عقود الإيجار", count: openContracts ?? 0 },
    { href: "/dashboard/inquiries", label: "الاستفسارات", count: newInquiries ?? 0 },
    { href: "/dashboard/bookings", label: "المعاينات" },
    { href: "/dashboard/availability", label: "مواعيدي المتاحة" },
  ];
  if (admin) {
    items.push(
      { href: "/dashboard/complaints", label: "الشكاوى", count: newComplaints ?? 0 },
      { href: "/dashboard/team", label: "الفريق" },
      { href: "/dashboard/settings", label: "إعدادات المكتب" },
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f7f4ef]">
      <header className="border-b border-sand-deep bg-paper">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Wordmark compact />
          <span className="hidden rounded bg-sand px-2 py-0.5 text-xs font-semibold text-ink-soft sm:inline">لوحة المكتب</span>
          <div className="ms-auto flex items-center gap-2 text-sm">
            <span className="hidden text-ink-soft sm:inline">
              {user.profile.full_name} — {ROLE_LABEL[user.profile.role]}
            </span>
            <Link href="/" className="btn btn-quiet btn-sm">الموقع</Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn btn-quiet btn-sm">خروج</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[13rem_1fr]">
        <aside className="min-w-0 lg:sticky lg:top-6 lg:h-fit">
          <DashNav items={items} />
        </aside>
        <main id="main" className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
