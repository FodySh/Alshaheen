import Link from "next/link";
import { notFound } from "next/navigation";
import { ContractAssignForm, ContractNoteForm, ContractStatusForm } from "@/components/dashboard/ContractActions";
import { FactList } from "@/components/FactList";
import { PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { RequestTimeline } from "@/components/RequestTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { isAdmin, requireStaff } from "@/lib/auth";
import {
  CONTRACT_KIND_LABEL,
  CONTRACT_PARTY_LABEL,
  CONTRACT_STATUS_LABEL,
  CONTRACT_TONE,
  PAYMENT_FREQUENCY_LABEL,
  PROPERTY_TYPE_LABEL,
  durationLabel,
} from "@/lib/constants";
import { daysUntil, formatDateTime, formatPlainDate, formatPrice, whatsappLink } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ContractEvent, ContractRequest } from "@/lib/types";

export const metadata = { title: "طلب توثيق عقد" };

/** تاريخ الانتهاء المتوقع = البداية + المدة - يوم */
function expectedEnd(start: string, months: number) {
  const d = new Date(`${start}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function ContactButtons({ phone, text }: { phone: string; text: string }) {
  return (
    <div className="flex gap-2">
      <a href={`tel:${phone}`} className="btn btn-secondary btn-sm"><PhoneIcon /> اتصال</a>
      <a href={whatsappLink(phone, text)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><WhatsAppIcon /> واتساب</a>
    </div>
  );
}

export default async function DashContractPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("contract_requests").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as ContractRequest;
  const admin = isAdmin(user);
  const canManage = admin || c.assigned_to === user.id;

  const [{ data: submitter }, { data: ev }, { data: staff }, { data: listing }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, email").eq("id", c.submitter_id).maybeSingle(),
    supabase.from("contract_events").select("*").eq("contract_id", id).order("created_at"),
    admin
      ? supabase.from("profiles").select("id, full_name").in("role", ["agent", "admin"]).eq("is_active", true).order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    c.listing_id ? supabase.from("listings").select("id, ref_no, title").eq("id", c.listing_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const events = (ev ?? []) as ContractEvent[];
  const actorIds = [...new Set(events.map((e) => e.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, full_name").in("id", actorIds) : { data: [] };
  const names = Object.fromEntries((actors ?? []).map((a: { id: string; full_name: string }) => [a.id, a.full_name]));

  const otherLabel = c.requester_role === "tenant" ? "المؤجر" : "المستأجر";
  const end = expectedEnd(c.start_date, c.duration_months);
  const facts: [string, string][] = [
    ["نوع العقد", `${CONTRACT_KIND_LABEL[c.contract_kind]}${c.is_renewal ? " (تجديد)" : ""}`],
    ["العقار", `${PROPERTY_TYPE_LABEL[c.property_type]}، حي ${c.district}`],
    ["رقم الصك", c.deed_number ?? "—"],
    ["الوحدة", c.unit_details ?? "—"],
    ["الإيجار السنوي", formatPrice(c.annual_rent)],
    ["الدفعات", PAYMENT_FREQUENCY_LABEL[c.payment_frequency]],
    ["التأمين", c.deposit ? formatPrice(c.deposit) : "—"],
    ["البداية", formatPlainDate(c.start_date)],
    ["المدة", durationLabel(c.duration_months)],
    ["الانتهاء المتوقع", formatPlainDate(end)],
  ];
  const d = c.contract_end_date ? daysUntil(c.contract_end_date) : null;

  return (
    <div>
      <nav className="mb-3 text-sm text-ink-soft">
        <Link href="/dashboard/contracts" className="hover:underline">عقود الإيجار</Link>
        <span aria-hidden className="mx-2 text-stone">/</span>
        <span className="num" dir="ltr">#{c.ref_no}</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">توثيق عقد {CONTRACT_KIND_LABEL[c.contract_kind]} — {c.district}</h1>
        <StatusBadge tone={CONTRACT_TONE[c.status]}>{CONTRACT_STATUS_LABEL[c.status]}</StatusBadge>
      </div>

      {c.status === "documented" && c.ejar_contract_number && (
        <div className={`mb-6 rounded-lg border px-4 py-3 ${d !== null && d <= 60 ? "border-clay/30 bg-clay-tint/60" : "border-olive/30 bg-olive-tint/60"}`}>
          <p>
            رقم عقد إيجار: <span className="num font-bold" dir="ltr">{c.ejar_contract_number}</span>
            {c.contract_end_date && <> — ينتهي في <span className="num font-semibold">{formatPlainDate(c.contract_end_date)}</span></>}
            {d !== null && d >= 0 && d <= 60 && <span className="ms-2 font-semibold text-clay">(بعد {d} يوم، تواصل للتجديد)</span>}
            {d !== null && d < 0 && <span className="ms-2 font-semibold text-clay">(انتهى)</span>}
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <section className="panel p-5">
            <h2 className="font-semibold">الأطراف</h2>
            <div className="mt-3 grid gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs text-ink-soft">مقدم الطلب — {CONTRACT_PARTY_LABEL[c.requester_role]}</p>
                  <p className="font-medium">{submitter?.full_name} <span className="num ms-2 text-ink-soft" dir="ltr">{submitter?.phone}</span></p>
                </div>
                {submitter?.phone && (
                  <div className="ms-auto">
                    <ContactButtons phone={submitter.phone} text={`السلام عليكم ${submitter.full_name}، معك الشاهين لإدارة الأملاك بخصوص طلب توثيق عقد الإيجار رقم ${c.ref_no}`} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-sand pt-4">
                <div>
                  <p className="text-xs text-ink-soft">{otherLabel}</p>
                  {c.other_party_name ? (
                    <p className="font-medium">{c.other_party_name} <span className="num ms-2 text-ink-soft" dir="ltr">{c.other_party_phone}</span></p>
                  ) : (
                    <p className="text-clay">لم يتفق مقدم الطلب مع {otherLabel} بعد</p>
                  )}
                </div>
                {c.other_party_phone && (
                  <div className="ms-auto">
                    <ContactButtons phone={c.other_party_phone} text={`السلام عليكم، معك الشاهين لإدارة الأملاك بخصوص توثيق عقد إيجار في حي ${c.district}`} />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="font-semibold">بيانات العقد</h2>
            <div className="mt-3"><FactList facts={facts} /></div>
            {c.notes && <p className="mt-4 whitespace-pre-line text-sm leading-7">{c.notes}</p>}
            {listing && (
              <p className="mt-4 text-sm">
                من العرض <Link href={`/dashboard/listings/${listing.id}`} className="text-olive-deep hover:underline"><span className="num" dir="ltr">#{listing.ref_no}</span> {listing.title}</Link>
              </p>
            )}
            <p className="mt-4 rounded-md bg-sand/60 px-3 py-2 text-sm text-ink-soft">
              عند إنشاء العقد في إيجار تحتاج: هوية الطرفين وتاريخ الميلاد، آيبان المؤجر، رقم الصك، والسجل التجاري للعقود التجارية.
            </p>
          </section>

          <section className="panel p-5">
            <h2 className="font-semibold">سجل الطلب</h2>
            <p className="mt-1 text-xs text-ink-soft">النقاط الرمادية داخلية لا يراها مقدم الطلب.</p>
            <div className="mt-4"><RequestTimeline events={events} names={names} labels={CONTRACT_STATUS_LABEL} /></div>
          </section>
        </div>

        <aside className="grid h-fit gap-4">
          {admin && (
            <div className="panel p-5">
              <ContractAssignForm contractId={c.id} current={c.assigned_to} staff={(staff ?? []) as { id: string; full_name: string }[]} />
            </div>
          )}
          {canManage ? (
            <>
              <div className="panel p-5">
                <ContractStatusForm contractId={c.id} current={c.status} minEnd={c.start_date} />
              </div>
              <div className="panel p-5">
                <ContractNoteForm contractId={c.id} />
              </div>
            </>
          ) : (
            <p className="panel p-5 text-sm text-ink-soft">الطلب غير مسند إليك.</p>
          )}
          <p className="text-xs text-ink-soft">قُدّم {formatDateTime(c.created_at)}</p>
        </aside>
      </div>
    </div>
  );
}
