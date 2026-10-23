import Link from "next/link";
import { FactList } from "@/components/FactList";
import { notFound } from "next/navigation";
import { AssignForm, NoteForm, StatusForm } from "@/components/dashboard/RequestActions";
import { FileGrid } from "@/components/FileGrid";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { RequestTimeline } from "@/components/RequestTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { createListingFromRequest } from "@/lib/actions/staff";
import { isAdmin, requireStaff } from "@/lib/auth";
import { CAPACITY_LABEL, PROPERTY_TYPE_LABEL, PURPOSE_LABEL, REQUEST_STATUS_LABEL, REQUEST_TONE } from "@/lib/constants";
import { signRequestFiles } from "@/lib/data/files";
import { formatArea, formatDateTime, formatNumber, formatPrice, whatsappLink } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { MarketingRequest, RequestEvent, RequestFile } from "@/lib/types";

export const metadata = { title: "طلب تسويق" };

export default async function DashRequestPage({
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
  const supabase = await createClient();
  const { data } = await supabase.from("marketing_requests").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as MarketingRequest;
  const admin = isAdmin(user);
  const canManage = admin || r.assigned_to === user.id;

  const [{ data: submitter }, { data: ev }, { data: fl }, { data: staff }, { data: listing }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, email").eq("id", r.submitter_id).maybeSingle(),
    supabase.from("request_events").select("*").eq("request_id", id).order("created_at"),
    supabase.from("request_files").select("*").eq("request_id", id).order("created_at"),
    admin
      ? supabase.from("profiles").select("id, full_name").in("role", ["agent", "admin"]).eq("is_active", true).order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    supabase.from("listings").select("id, status, ref_no").eq("request_id", id).maybeSingle(),
  ]);
  const events = (ev ?? []) as RequestEvent[];
  const files = await signRequestFiles(supabase, (fl ?? []) as RequestFile[]);

  const actorIds = [...new Set(events.map((e) => e.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };
  const names = Object.fromEntries((actors ?? []).map((a: { id: string; full_name: string }) => [a.id, a.full_name]));

  const facts: [string, string][] = [
    ["صفة مقدم الطلب", CAPACITY_LABEL[r.capacity]],
    ["رقم الصك", r.deed_number],
    ["المساحة", formatArea(r.area_sqm)],
    ["السعر المطلوب", formatPrice(r.asking_price, r.rent_period)],
  ];
  if (r.bedrooms !== null) facts.push(["الغرف", formatNumber(r.bedrooms)]);
  if (r.bathrooms !== null) facts.push(["دورات المياه", formatNumber(r.bathrooms)]);
  if (r.age_years !== null) facts.push(["عمر العقار", `${formatNumber(r.age_years)} سنة`]);
  if (r.street_width_m !== null) facts.push(["عرض الشارع", `${formatNumber(r.street_width_m)} م`]);
  if (r.facade) facts.push(["الواجهة", r.facade]);

  const canCreateListing = canManage && !listing && ["under_review", "awaiting_license"].includes(r.status);
  const hasAuthorization = files.some((f) => f.kind === "authorization");

  return (
    <div>
      <nav className="mb-3 text-sm text-ink-soft">
        <Link href="/dashboard/requests" className="hover:underline">طلبات التسويق</Link>
        <span aria-hidden className="mx-2 text-stone">/</span>
        <span className="num" dir="ltr">#{r.ref_no}</span>
      </nav>

      {sp.error === "listing" && (
        <p role="alert" className="mb-4 rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">تعذّر إنشاء مسودة العرض. تأكد أن الطلب مسند إليك.</p>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {PROPERTY_TYPE_LABEL[r.property_type]} {PURPOSE_LABEL[r.purpose]} في {r.district}
        </h1>
        <StatusBadge tone={REQUEST_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</StatusBadge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <section className="panel p-5">
            <h2 className="font-semibold">مقدم الطلب</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <p className="font-medium">{submitter?.full_name}</p>
              <p className="num text-ink-soft" dir="ltr">{submitter?.phone}</p>
              <p className="text-ink-soft" dir="ltr">{submitter?.email}</p>
              <div className="ms-auto flex gap-2">
                {submitter?.phone && (
                  <>
                    <a href={`tel:${submitter.phone}`} className="btn btn-secondary btn-sm"><PhoneIcon /> اتصال</a>
                    <a
                      href={whatsappLink(submitter.phone, `السلام عليكم ${submitter.full_name}، معك الشاهين لإدارة الأملاك بخصوص طلبك رقم ${r.ref_no}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      <WhatsAppIcon /> واتساب
                    </a>
                  </>
                )}
              </div>
            </div>
            {r.capacity === "authorized_agent" && !hasAuthorization && (
              <p className="mt-3 rounded-md bg-clay-tint px-3 py-2 text-sm text-clay">مقدم الطلب وكيل ولم يرفق الوكالة بعد. اطلبها قبل استخراج الترخيص.</p>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="font-semibold">بيانات العقار</h2>
            <div className="mt-3"><FactList facts={facts} /></div>
            {r.address_note && <p className="mt-3 text-sm"><span className="text-ink-soft">الموقع: </span>{r.address_note}</p>}
            {r.description && <p className="mt-3 whitespace-pre-line text-sm leading-7">{r.description}</p>}
          </section>

          <section className="panel p-5">
            <h2 className="font-semibold">المرفقات</h2>
            <div className="mt-3">
              <FileGrid files={files} />
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="font-semibold">سجل الطلب</h2>
            <p className="mt-1 text-xs text-ink-soft">النقاط الرمادية داخلية لا يراها مقدم الطلب.</p>
            <div className="mt-4">
              <RequestTimeline events={events} names={names} />
            </div>
          </section>
        </div>

        <aside className="grid h-fit gap-4">
          {listing ? (
            <div className="panel p-5">
              <p className="font-semibold">العرض المرتبط</p>
              <Link href={`/dashboard/listings/${listing.id}`} className="btn btn-secondary mt-3 w-full">
                افتح العرض <span className="num" dir="ltr">#{listing.ref_no}</span>
              </Link>
            </div>
          ) : canCreateListing ? (
            <form action={createListingFromRequest} className="panel p-5">
              <input type="hidden" name="request_id" value={r.id} />
              <p className="font-semibold">جاهز للتسويق؟</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">ننشئ مسودة عرض ببيانات الطلب وصوره. تضيف رقم ترخيص الإعلان ثم تنشر.</p>
              <SubmitButton className="btn btn-primary mt-3 w-full" pendingLabel="جارٍ الإنشاء…">أنشئ مسودة العرض</SubmitButton>
            </form>
          ) : null}

          {admin && (
            <div className="panel p-5">
              <AssignForm requestId={r.id} current={r.assigned_to} staff={(staff ?? []) as { id: string; full_name: string }[]} />
            </div>
          )}

          {canManage ? (
            <>
              <div className="panel p-5">
                <StatusForm requestId={r.id} current={r.status} />
              </div>
              <div className="panel p-5">
                <NoteForm requestId={r.id} />
              </div>
            </>
          ) : (
            <p className="panel p-5 text-sm text-ink-soft">الطلب غير مسند إليك.</p>
          )}
          <p className="text-xs text-ink-soft">قُدّم {formatDateTime(r.created_at)}</p>
        </aside>
      </div>
    </div>
  );
}
