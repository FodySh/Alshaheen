"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionUser, isAdmin, isStaff } from "../auth";
import {
  CONTRACT_KIND_LABEL,
  CONTRACT_PARTY_LABEL,
  CONTRACT_STATUS_HELP,
  CONTRACT_STATUS_LABEL,
  PROPERTY_TYPES,
  durationLabel,
} from "../constants";
import { officeEmail, sendMail } from "../email";
import { formatPlainDate, formatPrice, riyadhToday } from "../format";
import { normalizeDigits, optionalNumber, str } from "../parse";
import { getProfileEmail } from "../supabase/admin";
import { createClient } from "../supabase/server";
import type { ActionState, ContractStatus, PropertyType } from "../types";
import { firstIssue } from "../validation";

const uuid = z.string().uuid();

function dbError(message: string | undefined) {
  if (message && /[؀-ۿ]/.test(message)) return message;
  if (message?.includes("row-level security") || message?.includes("permission denied")) return "ليست لديك صلاحية لهذا الإجراء.";
  return "تعذّر إتمام العملية. حاول مرة أخرى.";
}

function refresh(id?: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/account");
  if (id) revalidatePath(`/account/contracts/${id}`);
}

// =============================================================
// طلب توثيق جديد (المالك أو المستأجر)
// =============================================================

export async function createContractRequest(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const user = await actionUser();
  if (!user) return { error: "سجّل الدخول لتقديم الطلب." };

  const districtChoice = str(fd.get("district"));
  const hasOther = fd.get("has_other_party") === "yes";
  const phone = normalizeDigits(fd.get("other_party_phone"));

  const parsed = z
    .object({
      requester_role: z.enum(["landlord", "landlord_agent", "tenant"], { message: "حدد صفتك في العقد." }),
      contract_kind: z.enum(["residential", "commercial"], { message: "اختر نوع العقد: سكني أو تجاري." }),
      is_renewal: z.boolean(),
      property_type: z.enum(PROPERTY_TYPES as [PropertyType, ...PropertyType[]], { message: "اختر نوع العقار." }),
      district: z.string().trim().min(2, "اختر الحي.").max(60),
      deed_number: z.union([z.literal(""), z.string().trim().min(4, "رقم الصك قصير جداً.").max(40)]),
      unit_details: z.string().trim().max(100),
      other_party_name: z.string().trim().max(100),
      other_party_phone: z.union([z.literal(""), z.string().regex(/^05\d{8}$/, "جوال الطرف الآخر بصيغة 05xxxxxxxx.")]),
      annual_rent: z.number({ message: "اكتب قيمة الإيجار السنوي بالأرقام." }).positive("قيمة الإيجار يجب أن تكون أكبر من صفر.").max(1_000_000_000),
      payment_frequency: z.enum(["monthly", "quarterly", "semiannual", "annual"], { message: "اختر طريقة سداد الدفعات." }),
      deposit: z.number({ message: "اكتب مبلغ التأمين بالأرقام." }).min(0).max(1_000_000_000).nullable(),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "اختر تاريخ بداية العقد."),
      duration_months: z.number().int().min(1, "اختر مدة العقد.").max(120),
      notes: z.string().trim().max(2000),
    })
    .safeParse({
      requester_role: str(fd.get("requester_role")) || undefined,
      contract_kind: str(fd.get("contract_kind")) || undefined,
      is_renewal: fd.get("is_renewal") === "yes",
      property_type: str(fd.get("property_type")) || undefined,
      district: districtChoice === "__other" ? str(fd.get("district_other")) : districtChoice,
      deed_number: normalizeDigits(fd.get("deed_number")),
      unit_details: str(fd.get("unit_details")),
      other_party_name: hasOther ? str(fd.get("other_party_name")) : "",
      other_party_phone: hasOther ? phone : "",
      annual_rent: optionalNumber(fd.get("annual_rent")) ?? undefined,
      payment_frequency: str(fd.get("payment_frequency")) || undefined,
      deposit: optionalNumber(fd.get("deposit")),
      start_date: str(fd.get("start_date")),
      duration_months: optionalNumber(fd.get("duration_months")) ?? 0,
      notes: str(fd.get("notes")),
    });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  if (hasOther && (d.other_party_name.length < 2 || !d.other_party_phone))
    return { error: "اكتب اسم الطرف الآخر ورقم جواله، أو اختر \"لم نتفق بعد\"." };
  const today = riyadhToday();
  const minStart = new Date(`${today}T00:00:00Z`);
  minStart.setUTCDate(minStart.getUTCDate() - 60);
  if (d.start_date < minStart.toISOString().slice(0, 10)) return { error: "تاريخ البداية قديم جداً. لتوثيق عقد سابق تواصل مع المكتب مباشرة." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_requests")
    .insert({
      ...d,
      deed_number: d.deed_number || null,
      unit_details: d.unit_details || null,
      other_party_name: d.other_party_name || null,
      other_party_phone: d.other_party_phone || null,
      notes: d.notes || null,
    })
    .select("id, ref_no")
    .single();
  if (error) {
    console.error("[contract:create]", error.message);
    return { error: dbError(error.message) };
  }

  after(async () => {
    await sendMail({
      to: officeEmail(),
      subject: `طلب توثيق عقد إيجار جديد رقم ${data.ref_no}`,
      heading: "طلب توثيق عقد إيجار بانتظار الإسناد",
      lines: [
        `مقدم الطلب: ${user.profile.full_name} (${CONTRACT_PARTY_LABEL[d.requester_role]}) — ${user.profile.phone}`,
        `العقد: ${CONTRACT_KIND_LABEL[d.contract_kind]}${d.is_renewal ? " (تجديد)" : ""}، حي ${d.district}`,
        `الإيجار السنوي: ${formatPrice(d.annual_rent)}، المدة: ${durationLabel(d.duration_months)}، البداية: ${formatPlainDate(d.start_date)}`,
      ],
      action: { label: "افتح الطلب", path: `/dashboard/contracts/${data.id}` },
    });
    await sendMail({
      to: user.email,
      subject: `استلمنا طلب توثيق عقد الإيجار (رقم ${data.ref_no})`,
      heading: "استلمنا طلبك",
      lines: [
        `رقم الطلب: ${data.ref_no}`,
        "سيتواصل معك أحد الوسطاء لاستكمال البيانات، ثم ننشئ العقد في منصة إيجار ويصل للطرفين رابط الموافقة.",
      ],
      action: { label: "تابع الطلب", path: `/account/contracts/${data.id}` },
    });
  });

  refresh();
  redirect(`/account/contracts/${data.id}?new=1`);
}

// =============================================================
// إجراءات الفريق
// =============================================================

export async function assignContract(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const u = await actionUser();
  if (!isAdmin(u)) return { error: "الإسناد للمدير فقط." };
  const id = uuid.safeParse(fd.get("contract_id"));
  const agent = uuid.safeParse(fd.get("agent_id"));
  if (!id.success || !agent.success) return { error: "اختر الموظف." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_contract", { p_contract: id.data, p_agent: agent.data });
  if (error) return { error: dbError(error.message) };
  const { data: c } = await supabase.from("contract_requests").select("ref_no, district, contract_kind").eq("id", id.data).single();
  if (agent.data !== u!.id) {
    after(async () => {
      await sendMail({
        to: await getProfileEmail(agent.data),
        subject: `أُسند إليك طلب توثيق عقد رقم ${c?.ref_no}`,
        heading: "طلب توثيق عقد إيجار بانتظارك",
        lines: [`عقد ${CONTRACT_KIND_LABEL[c?.contract_kind as "residential"] ?? ""} في حي ${c?.district ?? ""}.`, "تواصل مع مقدم الطلب لاستكمال البيانات."],
        action: { label: "افتح الطلب", path: `/dashboard/contracts/${id.data}` },
      });
    });
  }
  refresh(id.data);
  return { ok: true, message: "أُسند الطلب." };
}

const STAFF_STATUSES = ["contacted", "awaiting_data", "sent_to_ejar", "documented", "cancelled"] as const;

export async function setContractStatus(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const u = await actionUser();
  if (!isStaff(u)) return { error: "هذا الإجراء لموظفي المكتب فقط." };
  const parsed = z
    .object({
      contract_id: uuid,
      status: z.enum(STAFF_STATUSES, { message: "اختر الحالة." }),
      note: z.string().trim().max(1000),
      internal: z.boolean(),
      ejar_number: z.string().trim().max(40),
      end_date: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
    })
    .safeParse({
      contract_id: fd.get("contract_id"),
      status: fd.get("status"),
      note: str(fd.get("note")),
      internal: fd.get("internal") === "on",
      ejar_number: normalizeDigits(fd.get("ejar_number")),
      end_date: str(fd.get("end_date")),
    });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;
  if (d.status === "documented" && (!d.ejar_number || !d.end_date)) return { error: "اكتب رقم عقد إيجار وتاريخ انتهاء العقد." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_contract_status", {
    p_contract: d.contract_id,
    p_status: d.status,
    p_note: d.note || null,
    p_internal: d.internal,
    p_ejar_number: d.ejar_number || null,
    p_end_date: d.end_date || null,
  });
  if (error) return { error: dbError(error.message) };

  const visible = !d.internal || d.status === "documented" || d.status === "cancelled";
  if (visible) {
    const { data: c } = await supabase.from("contract_requests").select("ref_no, submitter_id").eq("id", d.contract_id).single();
    const s = d.status as ContractStatus;
    after(async () => {
      await sendMail({
        to: await getProfileEmail(c?.submitter_id),
        subject: `تحديث على طلب توثيق العقد رقم ${c?.ref_no}: ${CONTRACT_STATUS_LABEL[s]}`,
        heading: `حالة طلبك الآن: ${CONTRACT_STATUS_LABEL[s]}`,
        lines: [
          CONTRACT_STATUS_HELP[s],
          s === "documented" ? `رقم عقد إيجار: ${d.ejar_number}، وينتهي في ${formatPlainDate(d.end_date)}.` : "",
          d.note ? `ملاحظة المكتب: ${d.note}` : "",
        ].filter(Boolean),
        action: { label: "تابع الطلب", path: `/account/contracts/${d.contract_id}` },
      });
    });
  }
  refresh(d.contract_id);
  return { ok: true, message: "حُدّثت الحالة." };
}

export async function addContractNote(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const u = await actionUser();
  if (!isStaff(u)) return { error: "هذا الإجراء لموظفي المكتب فقط." };
  const id = uuid.safeParse(fd.get("contract_id"));
  const note = str(fd.get("note"));
  if (!id.success || note.length < 2) return { error: "اكتب الملاحظة." };
  const internal = fd.get("visible") !== "on";
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_contract_note", { p_contract: id.data, p_note: note.slice(0, 1000), p_internal: internal });
  if (error) return { error: dbError(error.message) };
  if (!internal) {
    const { data: c } = await supabase.from("contract_requests").select("ref_no, submitter_id").eq("id", id.data).single();
    after(async () => {
      await sendMail({
        to: await getProfileEmail(c?.submitter_id),
        subject: `رسالة من المكتب بخصوص طلب توثيق العقد رقم ${c?.ref_no}`,
        heading: "رسالة جديدة على طلبك",
        lines: [note],
        action: { label: "تابع الطلب", path: `/account/contracts/${id.data}` },
      });
    });
  }
  refresh(id.data);
  return { ok: true, message: internal ? "أُضيفت الملاحظة الداخلية." : "أُرسلت الرسالة لمقدم الطلب." };
}

export async function createContractFromListing(fd: FormData) {
  const u = await actionUser();
  if (!isStaff(u)) return;
  const id = uuid.safeParse(fd.get("listing_id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_contract_from_listing", { p_listing: id.data });
  if (error || !data) {
    console.error("[contract:fromListing]", error?.message);
    redirect(`/dashboard/listings/${id.data}?error=contract`);
  }
  refresh();
  redirect(`/dashboard/contracts/${data}`);
}
