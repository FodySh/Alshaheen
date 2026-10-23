import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FactList } from "@/components/FactList";
import { RequestTimeline } from "@/components/RequestTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import {
  CONTRACT_KIND_LABEL,
  CONTRACT_PARTY_LABEL,
  CONTRACT_STATUS_HELP,
  CONTRACT_STATUS_LABEL,
  CONTRACT_TONE,
  PAYMENT_FREQUENCY_LABEL,
  PROPERTY_TYPE_LABEL,
  durationLabel,
} from "@/lib/constants";
import { formatDate, formatPlainDate, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ContractEvent, ContractRequest } from "@/lib/types";

export const metadata: Metadata = { title: "طلب توثيق عقد" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function ContractPage(props: Props) {
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
  const user = await requireUser(`/account/contracts/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("contract_requests").select("*").eq("id", id).maybeSingle();
  if (!data || data.submitter_id !== user.id) notFound();
  const c = data as ContractRequest;
  const { data: ev } = await supabase.from("contract_events").select("*").eq("contract_id", id).order("created_at");
  const other = c.requester_role === "tenant" ? "المؤجر" : "المستأجر";

  const facts: [string, string][] = [
    ["صفتك", CONTRACT_PARTY_LABEL[c.requester_role]],
    ["نوع العقد", `${CONTRACT_KIND_LABEL[c.contract_kind]}${c.is_renewal ? " (تجديد)" : ""}`],
    ["العقار", `${PROPERTY_TYPE_LABEL[c.property_type]}، حي ${c.district}`],
    ["الإيجار السنوي", formatPrice(c.annual_rent)],
    ["الدفعات", PAYMENT_FREQUENCY_LABEL[c.payment_frequency]],
    ["البداية", formatPlainDate(c.start_date)],
    ["المدة", durationLabel(c.duration_months)],
  ];
  if (c.deposit) facts.push(["التأمين", formatPrice(c.deposit)]);
  if (c.deed_number) facts.push(["رقم الصك", c.deed_number]);
  if (c.unit_details) facts.push(["الوحدة", c.unit_details]);
  facts.push([other, c.other_party_name ? `${c.other_party_name} — ${c.other_party_phone}` : "لم يُحدد بعد"]);

  return (
    <div className="grid gap-8">
      <nav className="text-sm text-ink-soft">
        <Link href="/account#contracts" className="hover:underline">حسابي</Link>
        <span aria-hidden className="mx-2 text-stone">/</span>
        طلب توثيق رقم <span className="num">{c.ref_no}</span>
      </nav>

      {sp.new === "1" && (
        <p role="status" className="rounded-md bg-olive-tint px-4 py-3 text-olive-deep">
          استلمنا طلبك برقم <span className="num font-semibold">{c.ref_no}</span>. سيتواصل معك أحد الوسطاء.
        </p>
      )}

      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">توثيق عقد إيجار {CONTRACT_KIND_LABEL[c.contract_kind]}</h1>
          <StatusBadge tone={CONTRACT_TONE[c.status]}>{CONTRACT_STATUS_LABEL[c.status]}</StatusBadge>
        </div>
        <p className="text-ink-soft">{CONTRACT_STATUS_HELP[c.status]}</p>
        {c.status === "documented" && c.ejar_contract_number && (
          <dl className="grid gap-1 rounded-lg border border-olive/30 bg-olive-tint/60 px-4 py-3 sm:grid-cols-2">
            <div className="flex gap-2"><dt className="text-ink-soft">رقم عقد إيجار:</dt><dd className="num font-bold" dir="ltr">{c.ejar_contract_number}</dd></div>
            {c.contract_end_date && <div className="flex gap-2"><dt className="text-ink-soft">ينتهي في:</dt><dd className="num font-semibold">{formatPlainDate(c.contract_end_date)}</dd></div>}
          </dl>
        )}
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_16rem]">
        <section>
          <h2 className="font-bold">بيانات الطلب</h2>
          <div className="mt-3"><FactList facts={facts} /></div>
          {c.notes && <p className="mt-4 whitespace-pre-line text-sm leading-7">{c.notes}</p>}
        </section>
        <aside>
          <h2 className="font-bold">سجل الطلب</h2>
          <p className="mt-1 text-xs text-ink-soft">قُدّم في {formatDate(c.created_at)}</p>
          <div className="mt-4"><RequestTimeline events={(ev ?? []) as ContractEvent[]} labels={CONTRACT_STATUS_LABEL} /></div>
        </aside>
      </div>
    </div>
  );
}
