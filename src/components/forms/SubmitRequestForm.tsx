"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createMarketingRequest, finalizeMarketingRequest } from "@/lib/actions/requests";
import { ACCEPT_DOCS, ACCEPT_IMAGES } from "@/lib/image";
import { createClient } from "@/lib/supabase/browser";
import { DocIcon, CloseIcon } from "../icons";
import { PropertyInputs } from "./PropertyInputs";
import { uploadRequestFiles, type PendingFile } from "./requestUploads";

const MAX_PHOTOS = 15;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-sand-deep pt-8 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {hint && <p className="mt-1 text-sm leading-7 text-ink-soft">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function SubmitRequestForm({ userId }: { userId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [capacity, setCapacity] = useState("owner");
  const [photos, setPhotos] = useState<File[]>([]);
  const [deed, setDeed] = useState<File | null>(null);
  const [authorization, setAuthorization] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const busy = progress !== null;

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const next = [...photos, ...Array.from(list)].slice(0, MAX_PHOTOS);
    setPhotos(next);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (capacity === "authorized_agent" && !authorization) {
      setError("أرفق صورة الوكالة الشرعية لأنك تقدم الطلب نيابة عن المالك.");
      return;
    }
    setProgress("جارٍ حفظ الطلب…");
    const fd = new FormData(e.currentTarget);
    const res = await createMarketingRequest(fd);
    if (!res.ok) {
      setError(res.error);
      setProgress(null);
      return;
    }

    const files: PendingFile[] = [
      ...photos.map((file) => ({ file, kind: "photo" as const })),
      ...(deed ? [{ file: deed, kind: "deed" as const }] : []),
      ...(authorization ? [{ file: authorization, kind: "authorization" as const }] : []),
    ];
    let failed: string[] = [];
    if (files.length) {
      const supabase = createClient();
      const r = await uploadRequestFiles(supabase, userId, res.id, files, (d, t) => setProgress(`جارٍ رفع المرفقات ${d} من ${t}…`));
      failed = r.failed;
    }
    await finalizeMarketingRequest(res.id);
    const q = failed.length ? `?new=1&failed=${failed.length}` : "?new=1";
    router.push(`/account/requests/${res.id}${q}`);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-8">
      <Section title="صفتك">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["owner", "مالك العقار", "الصك باسمك"],
            ["authorized_agent", "وكيل عن المالك", "معك وكالة شرعية سارية تخولك بالبيع أو التأجير"],
          ].map(([v, l, h]) => (
            <label key={v} className="cursor-pointer">
              <input type="radio" name="capacity" value={v} checked={capacity === v} onChange={() => setCapacity(v)} className="peer sr-only" />
              <span className="block h-full rounded-md border border-stone bg-white p-4 peer-checked:border-olive peer-checked:bg-olive-tint peer-focus-visible:outline-2 peer-focus-visible:outline-olive">
                <span className="block font-semibold">{l}</span>
                <span className="mt-1 block text-sm text-ink-soft">{h}</span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="بيانات العقار">
        <PropertyInputs priceName="asking_price" priceLabel="السعر المطلوب" />
        <div>
          <label htmlFor="address_note" className="label">وصف الموقع <span className="font-normal text-ink-soft">(اختياري)</span></label>
          <input id="address_note" name="address_note" maxLength={300} className="field" placeholder="مثال: قرب شارع الأمير سلطان، خلف مسجد…" />
          <span className="hint">لا يُنشر الموقع الدقيق قبل موافقتك.</span>
        </div>
        <div>
          <label htmlFor="description" className="label">وصف العقار <span className="font-normal text-ink-soft">(اختياري)</span></label>
          <textarea id="description" name="description" maxLength={3000} className="field" placeholder="التشطيب، المزايا، حالة العقار، أي معلومة تهم المشتري أو المستأجر" />
        </div>
      </Section>

      <Section title="الصك والمستندات" hint="نحتاج رقم الصك لاستخراج ترخيص الإعلان من الهيئة العامة للعقار. المستندات لا يراها إلا المكتب.">
        <div className="max-w-sm">
          <label htmlFor="deed_number" className="label">رقم الصك</label>
          <input id="deed_number" name="deed_number" required minLength={4} maxLength={40} className="field field-ltr num" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <DocPicker label="صورة الصك" hint="PDF أو صورة، اختياري ويسرّع المراجعة" file={deed} onChange={setDeed} />
          {capacity === "authorized_agent" && (
            <DocPicker label="صورة الوكالة الشرعية" hint="مطلوبة للوكلاء" file={authorization} onChange={setAuthorization} required />
          )}
        </div>
      </Section>

      <Section title="صور العقار" hint={`حتى ${MAX_PHOTOS} صورة. نضغطها تلقائياً قبل الرفع. الصور الواضحة بإضاءة النهار تسرّع البيع.`}>
        <div>
          <label className="btn btn-secondary cursor-pointer">
            أضف صوراً
            <input type="file" accept={ACCEPT_IMAGES} multiple className="sr-only" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} disabled={photos.length >= MAX_PHOTOS} />
          </label>
          <span className="ms-3 text-sm text-ink-soft num">{photos.length} / {MAX_PHOTOS}</span>
        </div>
        {photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {photos.map((p, i) => (
              <li key={`${p.name}-${i}`} className="relative">
                <Thumb file={p} />
                <button
                  type="button"
                  onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute end-1 top-1 rounded bg-paper/95 p-1 text-ink hover:bg-white"
                  aria-label={`إزالة ${p.name}`}
                >
                  <CloseIcon className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-3 border-t border-sand-deep pt-6">
        <p className="text-sm leading-7 text-ink-soft">
          بإرسال الطلب تقر بصحة البيانات وأن لديك الحق في تسويق العقار. لا يُنشر شيء قبل مراجعة المكتب وصدور ترخيص الإعلان.
        </p>
        {error && (
          <p role="alert" className="rounded-md border border-[#e3c2c2] bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-primary min-w-40" disabled={busy}>
            {busy ? "جارٍ الإرسال…" : "أرسل الطلب"}
          </button>
          {progress && <span role="status" className="text-sm text-ink-soft">{progress}</span>}
        </div>
      </div>
    </form>
  );
}

function Thumb({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={file.name} className="aspect-square w-full rounded-md object-cover" onLoad={() => URL.revokeObjectURL(url)} />;
}

function DocPicker({ label, hint, file, onChange, required }: { label: string; hint: string; file: File | null; onChange: (f: File | null) => void; required?: boolean }) {
  return (
    <div className="rounded-md border border-dashed border-stone bg-white p-4">
      <p className="font-semibold">{label}{required && <span className="text-danger"> *</span>}</p>
      <p className="text-sm text-ink-soft">{hint}</p>
      {file ? (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <DocIcon className="size-5 text-olive" />
          <span className="truncate">{file.name}</span>
          <button type="button" className="btn btn-quiet btn-sm ms-auto" onClick={() => onChange(null)}>إزالة</button>
        </div>
      ) : (
        <label className="btn btn-secondary btn-sm mt-3 cursor-pointer">
          اختر ملفاً
          <input type="file" accept={ACCEPT_DOCS} className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}
