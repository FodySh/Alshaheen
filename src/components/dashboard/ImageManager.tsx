"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteListingImage, moveListingImage, syncListingImages } from "@/lib/actions/staff";
import { ACCEPT_IMAGES, compressImage, extFor, MAX_FILE_BYTES, randomName } from "@/lib/image";
import { createClient } from "@/lib/supabase/browser";
import { publicImageUrl } from "@/lib/supabase/env";
import type { ListingImage } from "@/lib/types";

export function ImageManager({ listingId, images }: { listingId: string; images: ListingImage[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    const supabase = createClient();
    const files = Array.from(list).slice(0, 20);
    let order = images.length;
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      setStatus(`جارٍ رفع ${i + 1} من ${files.length}…`);
      try {
        const blob = await compressImage(files[i]);
        if (blob.size > MAX_FILE_BYTES) throw new Error("large");
        const path = `${listingId}/${randomName(extFor(blob, files[i].name))}`;
        const { error } = await supabase.storage.from("listing-images").upload(path, blob, { contentType: blob.type });
        if (error) throw error;
        const { error: rowErr } = await supabase.from("listing_images").insert({ listing_id: listingId, storage_path: path, sort_order: order++ });
        if (rowErr) throw rowErr;
      } catch {
        failed++;
      }
    }
    await syncListingImages(listingId);
    setStatus(failed ? `تعذّر رفع ${failed} صورة. استخدم JPG أو PNG أو WebP بحجم أقل من 10 ميجابايت.` : null);
    router.refresh();
  }

  return (
    <section className="panel p-5" aria-labelledby="img-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="img-h" className="font-semibold">الصور</h2>
          <p className="text-sm text-ink-soft">الصورة الأولى هي الغلاف في القوائم.</p>
        </div>
        <label className="btn btn-secondary cursor-pointer">
          أضف صوراً
          <input type="file" multiple accept={ACCEPT_IMAGES} className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      {status && <p role="status" className="mt-3 text-sm text-ink-soft">{status}</p>}
      {images.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-stone px-4 py-8 text-center text-sm text-ink-soft">لا توجد صور. العروض بالصور تحصل على استفسارات أكثر.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="overflow-hidden rounded-md border border-sand-deep bg-white">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={publicImageUrl(img.storage_path) ?? ""} alt="" className="aspect-[4/3] w-full object-cover" />
                {i === 0 && <span className="absolute start-2 top-2 rounded bg-olive px-1.5 text-xs font-semibold text-white">الغلاف</span>}
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <div className="flex">
                  {i > 0 && (
                    <form action={moveListingImage}>
                      <input type="hidden" name="listing_id" value={listingId} />
                      <input type="hidden" name="image_id" value={img.id} />
                      <button name="dir" value="first" className="btn btn-quiet btn-sm text-xs" title="اجعلها الغلاف">غلاف</button>
                    </form>
                  )}
                  {i > 0 && (
                    <form action={moveListingImage}>
                      <input type="hidden" name="listing_id" value={listingId} />
                      <input type="hidden" name="image_id" value={img.id} />
                      <button name="dir" value="up" className="btn btn-quiet btn-sm text-xs" aria-label="قدّم الصورة">قدّم</button>
                    </form>
                  )}
                  {i < images.length - 1 && (
                    <form action={moveListingImage}>
                      <input type="hidden" name="listing_id" value={listingId} />
                      <input type="hidden" name="image_id" value={img.id} />
                      <button name="dir" value="down" className="btn btn-quiet btn-sm text-xs" aria-label="أخّر الصورة">أخّر</button>
                    </form>
                  )}
                </div>
                <form action={deleteListingImage} onSubmit={(e) => { if (!confirm("حذف الصورة؟")) e.preventDefault(); }}>
                  <input type="hidden" name="listing_id" value={listingId} />
                  <input type="hidden" name="image_id" value={img.id} />
                  <button className="btn btn-quiet btn-sm text-xs text-danger" aria-label="احذف الصورة">حذف</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
