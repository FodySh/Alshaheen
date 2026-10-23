"use client";
import { ActionForm } from "../forms/ActionForm";
import { useActionState } from "react";
import { saveListing } from "@/lib/actions/staff";
import { FEATURES } from "@/lib/constants";
import type { Listing } from "@/lib/types";
import { FormMessage } from "../forms/FormMessage";
import { PropertyInputs } from "../forms/PropertyInputs";
import { SubmitButton } from "../forms/SubmitButton";

export function ListingEditor({
  listing,
  staff,
  isAdmin,
  today,
  currentUserId,
}: {
  listing?: Listing;
  staff: { id: string; full_name: string }[];
  isAdmin: boolean;
  today: string;
  currentUserId: string;
}) {
  const [state, action] = useActionState(saveListing, null);
  const published = listing?.status === "published";

  return (
    <ActionForm action={action} className="grid gap-6">
      {listing && <input type="hidden" name="id" value={listing.id} />}

      <section className="panel grid gap-5 p-5">
        <h2 className="font-semibold">العنوان والوصف</h2>
        <div>
          <label htmlFor="title" className="label">عنوان العرض</label>
          <input id="title" name="title" required minLength={5} maxLength={120} defaultValue={listing?.title} className="field" placeholder="مثال: شقة 4 غرف بمدخل مستقل في حي الروضة" />
        </div>
        <div>
          <label htmlFor="description" className="label">الوصف</label>
          <textarea id="description" name="description" maxLength={5000} defaultValue={listing?.description} className="field min-h-36" />
          <span className="hint">اذكر ما يؤثر في قرار المشتري أو المستأجر: الحالة، الالتزامات، أي نزاع قائم إن وجد.</span>
        </div>
      </section>

      <section className="panel grid gap-5 p-5">
        <h2 className="font-semibold">العقار والسعر</h2>
        <PropertyInputs defaults={listing} priceName="price" priceLabel="السعر" priceDefault={listing?.price} />
        <fieldset>
          <legend className="label">المزايا</legend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="features" value={f} defaultChecked={listing?.features.includes(f)} className="size-4 accent-olive" />
                {f}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="map_url" className="label">رابط الموقع على الخريطة <span className="font-normal text-ink-soft">(اختياري)</span></label>
          <input id="map_url" name="map_url" type="url" defaultValue={listing?.map_url ?? ""} className="field field-ltr" placeholder="https://maps.google.com/…" />
        </div>
      </section>

      <section className="panel grid gap-5 p-5">
        <div>
          <h2 className="font-semibold">ترخيص الإعلان العقاري</h2>
          <p className="mt-1 text-sm text-ink-soft">مطلوب للنشر. يظهر في صفحة العرض، ويُخفى العرض تلقائياً عن الزوار يوم انتهاء الترخيص.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="ad_license_number" className="label">رقم ترخيص الإعلان</label>
            <input id="ad_license_number" name="ad_license_number" defaultValue={listing?.ad_license_number ?? ""} maxLength={40} className="field field-ltr num" />
          </div>
          <div>
            <label htmlFor="ad_license_expiry" className="label">تاريخ انتهاء الترخيص</label>
            <input id="ad_license_expiry" name="ad_license_expiry" type="date" min={published ? undefined : today} defaultValue={listing?.ad_license_expiry ?? ""} className="field field-ltr num" />
          </div>
        </div>
        {published && (
          <p className="rounded-md bg-sand px-3 py-2 text-sm text-ink-soft">
            العرض منشور. أي تعديل في السعر أو الوصف أو بيانات العقار يجب أن يطابق ما صدر به الترخيص.
          </p>
        )}
      </section>

      {isAdmin && staff.length > 0 && (
        <section className="panel p-5">
          <label htmlFor="agent_id" className="label">الوسيط المسؤول</label>
          <select id="agent_id" name="agent_id" defaultValue={listing?.agent_id ?? currentUserId} className="field max-w-sm">
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name || "بدون اسم"}</option>
            ))}
          </select>
          <span className="hint">تصل للوسيط استفسارات العرض، ويحجز الزوار من مواعيده المتاحة.</span>
        </section>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-sand-deep bg-[#f7f4ef]/95 px-4 py-3 backdrop-blur">
        {published ? (
          <>
            <SubmitButton name="intent" value="save" className="btn btn-primary">احفظ التعديلات</SubmitButton>
            <SubmitButton name="intent" value="unpublish" className="btn btn-secondary" pendingLabel="جارٍ الإخفاء…">أخفِ العرض (مسودة)</SubmitButton>
          </>
        ) : (
          <>
            {/* زر الحفظ أولاً في الترتيب حتى لا يؤدي ضغط Enter إلى النشر */}
            <SubmitButton name="intent" value="save" className="btn btn-secondary order-2">احفظ كمسودة</SubmitButton>
            <SubmitButton name="intent" value="publish" className="btn btn-primary order-1" pendingLabel="جارٍ النشر…">انشر العرض</SubmitButton>
          </>
        )}
        <div className="order-3 min-w-0 flex-1"><FormMessage state={state} /></div>
      </div>
    </ActionForm>
  );
}
