import type { Metadata } from "next";
import Link from "next/link";
import { FactList } from "@/components/FactList";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FileGrid } from "@/components/FileGrid";
import { AddRequestFiles } from "@/components/forms/AddRequestFiles";
import { RequestTimeline } from "@/components/RequestTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import {
  CAPACITY_LABEL,
  PROPERTY_TYPE_LABEL,
  PURPOSE_LABEL,
  REQUEST_STATUS_HELP,
  REQUEST_STATUS_LABEL,
  REQUEST_TONE,
} from "@/lib/constants";
import { signRequestFiles } from "@/lib/data/files";
import { formatArea, formatDate, formatNumber, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { MarketingRequest, RequestEvent, RequestFile } from "@/lib/types";

export const metadata: Metadata = { title: "طلب التسويق" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function RequestPage(props: Props) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-sand/50" />}>
        <Detail {...props} />
      </Suspense>
    </div>
  );
}

async function Detail({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/account/requests/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("marketing_requests").select("*").eq("id", id).maybeSingle();
  if (!data || data.submitter_id !== user.id) notFound();
  const r = data as MarketingRequest;

  const [{ data: ev }, { data: fl }] = await Promise.all([
    supabase.from("request_events").select("*").eq("request_id", id).order("created_at"),
    supabase.from("request_files").select("*").eq("request_id", id).order("created_at"),
  ]);
  const events = (ev ?? []) as RequestEvent[];
  const files = await signRequestFiles(supabase, (fl ?? []) as RequestFile[]);
  const open = ["new", "under_review", "awaiting_license"].includes(r.status);

  const facts: [string, string][] = [
    ["صفتك", CAPACITY_LABEL[r.capacity]],
    ["المساحة", formatArea(r.area_sqm)],
    ["السعر المطلوب", formatPrice(r.asking_price, r.rent_period)],
    ["رقم الصك", r.deed_number],
  ];
  if (r.bedrooms !== null) facts.push(["الغرف", formatNumber(r.bedrooms)]);
  if (r.bathrooms !== null) facts.push(["دورات المياه", formatNumber(r.bathrooms)]);
  if (r.age_years !== null) facts.push(["عمر العقار", `${formatNumber(r.age_years)} سنة`]);
  if (r.street_width_m !== null) facts.push(["عرض الشارع", `${formatNumber(r.street_width_m)} م`]);
  if (r.facade) facts.push(["الواجهة", r.facade]);

  return (
    <div className="grid gap-8">
      <nav className="text-sm text-ink-soft">
        <Link href="/account#requests" className="hover:underline">حسابي</Link>
        <span aria-hidden className="mx-2 text-stone">/</span>
        طلب رقم <span className="num">{r.ref_no}</span>
      </nav>

      {sp.new === "1" && (
        <p role="status" className="rounded-md bg-olive-tint px-4 py-3 text-olive-deep">
          استلمنا طلبك برقم <span className="num font-semibold">{r.ref_no}</span>. أرسلنا التأكيد إلى بريدك.
          {sp.failed && <span className="block text-clay">تعذّر رفع بعض المرفقات. أضفها مرة أخرى من الأسفل.</span>}
        </p>
      )}

      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {PROPERTY_TYPE_LABEL[r.property_type]} {PURPOSE_LABEL[r.purpose]} في {r.district}
          </h1>
          <StatusBadge tone={REQUEST_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</StatusBadge>
        </div>
        <p className="text-ink-soft">{REQUEST_STATUS_HELP[r.status]}</p>
        {r.status === "rejected" && r.rejection_reason && (
          <p className="rounded-md bg-danger-tint px-4 py-3 text-sm text-danger">سبب الرفض: {r.rejection_reason}</p>
        )}
        {r.status === "published" && r.listing_id && (
          <p>
            <Link href={`/listings/${r.listing_id}`} className="btn btn-primary btn-sm">شاهد العرض المنشور</Link>
          </p>
        )}
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_16rem]">
        <div className="grid gap-8">
          <section>
            <h2 className="font-bold">بيانات الطلب</h2>
            <div className="mt-3"><FactList facts={facts} /></div>
            {r.description && <p className="mt-4 whitespace-pre-line text-sm leading-7">{r.description}</p>}
          </section>

          <section>
            <h2 className="font-bold">المرفقات</h2>
            <div className="mt-3">
              <FileGrid files={files} />
            </div>
            {open && (
              <div className="mt-5 rounded-lg border border-sand-deep bg-sand/40 p-4">
                <AddRequestFiles userId={user.id} requestId={r.id} />
              </div>
            )}
          </section>
        </div>

        <aside>
          <h2 className="font-bold">سجل الطلب</h2>
          <p className="mt-1 text-xs text-ink-soft">قُدّم في {formatDate(r.created_at)}</p>
          <div className="mt-4">
            <RequestTimeline events={events} />
          </div>
        </aside>
      </div>
    </div>
  );
}
