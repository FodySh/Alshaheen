import Link from "next/link";
import { EmptyState, FilterTabs, PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isAdmin, requireStaff } from "@/lib/auth";
import { LISTING_STATUS_LABEL, LISTING_TONE, PROPERTY_TYPE_LABEL, PURPOSE_LABEL } from "@/lib/constants";
import { daysUntil, formatPlainDate, formatPrice } from "@/lib/format";
import { publicImageUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Listing, ListingStatus } from "@/lib/types";

export const metadata = { title: "العروض" };

const TABS: { value: string; label: string; statuses?: ListingStatus[] }[] = [
  { value: "published", label: "منشور", statuses: ["published"] },
  { value: "draft", label: "مسودات", statuses: ["draft"] },
  { value: "closed", label: "مُباع أو مؤجَّر", statuses: ["sold", "rented"] },
  { value: "archived", label: "مؤرشف", statuses: ["archived"] },
  { value: "all", label: "الكل" },
];

type Row = Pick<Listing, "id" | "ref_no" | "title" | "property_type" | "purpose" | "district" | "price" | "rent_period" | "status" | "ad_license_expiry" | "cover_image_path" | "agent_id"> & {
  agent: { full_name: string } | null;
};

export default async function ListingsDash({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.value === sp.tab) ?? TABS[0];
  const mine = sp.mine === "1" || !isAdmin(user);
  const supabase = await createClient();

  let q = supabase
    .from("listings")
    .select("id, ref_no, title, property_type, purpose, district, price, rent_period, status, ad_license_expiry, cover_image_path, agent_id, agent:profiles!listings_agent_id_fkey(full_name)")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (tab.statuses) q = q.in("status", tab.statuses);
  if (mine) q = q.eq("agent_id", user.id);
  const { data } = await q;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div>
      <PageHeader
        title="العروض"
        lead={mine ? "العروض المسؤول عنها أنت." : "كل عروض المكتب."}
        actions={<Link href="/dashboard/listings/new" className="btn btn-primary">عرض جديد</Link>}
      />
      <FilterTabs current={tab.value} tabs={TABS.map((t) => ({ value: t.value, label: t.label, href: `/dashboard/listings?tab=${t.value}` }))} />
      {rows.length === 0 ? (
        <EmptyState title="لا توجد عروض هنا">
          تُنشأ العروض من طلبات التسويق، أو مباشرة من زر &quot;عرض جديد&quot;.
        </EmptyState>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16"></th>
                <th>العرض</th>
                <th>السعر</th>
                <th>ترخيص الإعلان</th>
                {!mine && <th>الوسيط</th>}
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const img = publicImageUrl(l.cover_image_path);
                const d = l.ad_license_expiry ? daysUntil(l.ad_license_expiry) : null;
                const expired = l.status === "published" && d !== null && d < 0;
                return (
                  <tr key={l.id}>
                    <td>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="h-11 w-14 rounded object-cover" />
                      ) : (
                        <div className="h-11 w-14 rounded bg-sand" />
                      )}
                    </td>
                    <td>
                      <Link href={`/dashboard/listings/${l.id}`} className="font-medium hover:underline">{l.title}</Link>
                      <span className="block text-xs text-ink-soft">
                        <span className="num" dir="ltr">#{l.ref_no}</span> {PROPERTY_TYPE_LABEL[l.property_type]} {PURPOSE_LABEL[l.purpose]} — {l.district}
                      </span>
                    </td>
                    <td className="num whitespace-nowrap">{formatPrice(l.price, l.rent_period)}</td>
                    <td className="whitespace-nowrap text-sm">
                      {l.ad_license_expiry ? (
                        <span className={expired ? "font-semibold text-danger" : d !== null && d <= 7 ? "font-semibold text-clay" : "text-ink-soft"}>
                          {expired ? "منتهي — مخفي" : `حتى ${formatPlainDate(l.ad_license_expiry)}`}
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    {!mine && <td className="text-sm">{l.agent?.full_name}</td>}
                    <td><StatusBadge tone={expired ? "danger" : LISTING_TONE[l.status]}>{LISTING_STATUS_LABEL[l.status]}</StatusBadge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {isAdmin(user) && (
        <p className="mt-3 text-sm">
          <Link href={mine ? `/dashboard/listings?tab=${tab.value}` : `/dashboard/listings?tab=${tab.value}&mine=1`} className="text-olive-deep hover:underline">
            {mine ? "اعرض عروض المكتب كلها" : "اعرض عروضي فقط"}
          </Link>
        </p>
      )}
    </div>
  );
}
