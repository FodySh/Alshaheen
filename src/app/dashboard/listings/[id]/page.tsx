import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageManager } from "@/components/dashboard/ImageManager";
import { ListingEditor } from "@/components/dashboard/ListingEditor";
import { ConfirmForm } from "@/components/forms/ConfirmForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { StatusBadge } from "@/components/StatusBadge";
import { deleteListing, setListingStatus } from "@/lib/actions/staff";
import { isAdmin, requireStaff } from "@/lib/auth";
import { LISTING_STATUS_LABEL, LISTING_TONE } from "@/lib/constants";
import { daysUntil, riyadhToday } from "@/lib/format";
import { getDistricts } from "@/lib/data/public";
import { createClient } from "@/lib/supabase/server";
import type { Listing, ListingImage } from "@/lib/types";

export const metadata = { title: "تعديل العرض" };

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = isAdmin(user);
  const supabase = await createClient();
  const [{ data }, { data: imgs }, { data: staff }] = await Promise.all([
    supabase.from("listings").select("*").eq("id", id).maybeSingle(),
    supabase.from("listing_images").select("id, listing_id, storage_path, sort_order").eq("listing_id", id).order("sort_order").order("created_at"),
    admin
      ? supabase.from("profiles").select("id, full_name").in("role", ["agent", "admin"]).eq("is_active", true).order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  if (!data) notFound();
  const l = data as Listing;
  const canEdit = admin || l.agent_id === user.id;
  const expired = l.status === "published" && l.ad_license_expiry && daysUntil(l.ad_license_expiry) < 0;

  return (
    <div>
      <nav className="mb-3 text-sm text-ink-soft">
        <Link href="/dashboard/listings" className="hover:underline">العروض</Link>
        <span aria-hidden className="mx-2 text-stone">/</span>
        <span className="num" dir="ltr">#{l.ref_no}</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">{l.title}</h1>
        <StatusBadge tone={expired ? "danger" : LISTING_TONE[l.status]}>{expired ? "منتهي الترخيص" : LISTING_STATUS_LABEL[l.status]}</StatusBadge>
        {l.status === "published" && !expired && (
          <Link href={`/listings/${l.id}`} target="_blank" className="text-sm text-olive-deep hover:underline">شاهده في الموقع</Link>
        )}
        {l.request_id && (
          <Link href={`/dashboard/requests/${l.request_id}`} className="text-sm text-olive-deep hover:underline">طلب التسويق المرتبط</Link>
        )}
      </div>

      {sp.created === "1" && (
        <p role="status" className="mb-4 rounded-md bg-olive-tint px-4 py-3 text-sm text-olive-deep">
          أُنشئت المسودة. راجع البيانات والصور، ثم أدخل رقم ترخيص الإعلان وانشر.
        </p>
      )}
      {expired && (
        <p role="alert" className="mb-4 rounded-md bg-danger-tint px-4 py-3 text-sm text-danger">
          انتهى ترخيص الإعلان والعرض مخفي عن الزوار. جدّد الترخيص وحدّث رقمه وتاريخه ثم احفظ.
        </p>
      )}

      {canEdit ? (
        <div className="grid gap-6">
          <ImageManager listingId={l.id} images={(imgs ?? []) as ListingImage[]} />
          <ListingEditor listing={l} staff={(staff ?? []) as { id: string; full_name: string }[]} isAdmin={admin} today={riyadhToday()} currentUserId={user.id} districts={await getDistricts()} />

          <section className="panel p-5">
            <h2 className="font-semibold">إغلاق العرض</h2>
            <p className="mt-1 text-sm text-ink-soft">يُخفى العرض عن الزوار، ويُغلق طلب التسويق المرتبط تلقائياً عند البيع أو التأجير.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(l.purpose === "sale" ? (["sold"] as const) : (["rented"] as const)).map((s) => (
                <form key={s} action={setListingStatus}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="status" value={s} />
                  <SubmitButton className="btn btn-secondary btn-sm">{s === "sold" ? "تم البيع" : "تم التأجير"}</SubmitButton>
                </form>
              ))}
              {l.status !== "archived" && (
                <form action={setListingStatus}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="status" value="archived" />
                  <SubmitButton className="btn btn-secondary btn-sm">أرشفة</SubmitButton>
                </form>
              )}
              {["sold", "rented", "archived"].includes(l.status) && (
                <form action={setListingStatus}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="status" value="draft" />
                  <SubmitButton className="btn btn-quiet btn-sm">أعده مسودة</SubmitButton>
                </form>
              )}
              {admin && (
                <ConfirmForm action={deleteListing} className="ms-auto" message="حذف العرض وصوره نهائياً؟ لا يمكن التراجع.">
                  <input type="hidden" name="id" value={l.id} />
                  <SubmitButton className="btn btn-danger btn-sm" pendingLabel="جارٍ الحذف…">حذف نهائي</SubmitButton>
                </ConfirmForm>
              )}
            </div>
          </section>
        </div>
      ) : (
        <p className="panel p-5 text-sm text-ink-soft">هذا العرض مسند لوسيط آخر. التعديل للوسيط المسؤول أو المدير.</p>
      )}
    </div>
  );
}
