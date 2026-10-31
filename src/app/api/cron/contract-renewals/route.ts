import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { CONTRACT_KIND_LABEL, CONTRACT_RENEWAL_DAYS } from "@/lib/constants";
import { officeEmail, sendMail } from "@/lib/email";
import { daysUntil, formatPlainDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContractRequest } from "@/lib/types";

/**
 * مهمة يومية (Vercel Cron): تنبيه تجديد عقود الإيجار قبل انتهائها بـ60 يوماً.
 * آمنة للتكرار: كل عقد يُنبَّه مرة واحدة، ويُعاد التنبيه فقط إذا وُثّق عقد جديد.
 */
/** مقارنة بزمن ثابت حتى لا يُستنتج السر من زمن الرد */
function sameSecret(given: string | null, expected: string) {
  const a = createHash("sha256").update(given ?? "").digest();
  const b = createHash("sha256").update(`Bearer ${expected}`).digest();
  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameSecret(request.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return Response.json({ error: "SUPABASE_SECRET_KEY missing" }, { status: 500 });

  const { data, error } = await admin.rpc("contracts_due_for_renewal", { p_days: CONTRACT_RENEWAL_DAYS });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const due = (data ?? []) as ContractRequest[];

  let sent = 0;
  for (const c of due) {
    // نحجز العقد أولاً: إن سبقنا تشغيل آخر فلن نرسل مرتين
    const { data: claimed } = await admin
      .from("contract_requests")
      .update({ renewal_reminded_at: new Date().toISOString() })
      .eq("id", c.id)
      .is("renewal_reminded_at", null)
      .select("id");
    if (!claimed?.length) continue;

    const ids = [c.submitter_id, c.assigned_to].filter((x): x is string => !!x);
    if (ids.length === 0) ids.push("00000000-0000-0000-0000-000000000000");
    const { data: people } = await admin.from("profiles").select("id, email, full_name").in("id", ids);
    const byId = new Map((people ?? []).map((p: { id: string; email: string | null; full_name: string }) => [p.id, p]));
    const ownerProfile = c.submitter_id ? byId.get(c.submitter_id) : undefined;
    const owner = { full_name: c.requester_name ?? ownerProfile?.full_name, email: c.requester_email ?? ownerProfile?.email ?? null };
    const agent = c.assigned_to ? byId.get(c.assigned_to) : null;
    const days = c.contract_end_date ? daysUntil(c.contract_end_date) : CONTRACT_RENEWAL_DAYS;
    const endText = c.contract_end_date ? formatPlainDate(c.contract_end_date) : "";

    await sendMail({
      to: agent?.email ?? officeEmail(),
      subject: `عقد إيجار ينتهي بعد ${days} يوماً — طلب ${c.ref_no}`,
      heading: "عقد إيجار يقترب من الانتهاء",
      lines: [
        `عقد ${CONTRACT_KIND_LABEL[c.contract_kind]} في حي ${c.district}، رقم عقد إيجار ${c.ejar_contract_number ?? ""}.`,
        `ينتهي في ${endText}.`,
        `تواصل مع ${owner?.full_name ?? "العميل"} لترتيب التجديد.`,
      ],
      action: { label: "افتح الطلب", path: `/dashboard/contracts/${c.id}` },
    });
    await sendMail({
      to: owner?.email,
      subject: `عقد الإيجار ينتهي في ${endText}`,
      heading: "هل تريد تجديد عقد الإيجار؟",
      lines: [
        `عقد الإيجار رقم ${c.ejar_contract_number ?? ""} في حي ${c.district} ينتهي في ${endText}.`,
        "سنتواصل معك لترتيب التجديد، أو قدّم طلب تجديد من الموقع.",
      ],
      action: { label: "طلب تجديد", path: "/contracts" },
    });

    await admin.from("contract_events").insert({
      contract_id: c.id,
      note: `أُرسل تنبيه التجديد (ينتهي العقد في ${endText})`,
      is_internal: true,
    });
    sent++;
  }
  return Response.json({ due: due.length, reminded: sent });
}
