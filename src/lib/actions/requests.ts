"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionUser } from "../auth";
import { CAPACITY_LABEL, PROPERTY_TYPE_LABEL, PURPOSE_LABEL } from "../constants";
import { officeEmail, sendMail } from "../email";
import { formatArea, formatPrice } from "../format";
import { optionalNumber, str } from "../parse";
import { createClient } from "../supabase/server";
import { firstIssue, priceSchema, propertyInput, propertySchema } from "../validation";

type CreateResult = { ok: true; id: string; refNo: number } | { ok: false; error: string };

export async function createMarketingRequest(fd: FormData): Promise<CreateResult> {
  const user = await actionUser();
  if (!user) return { ok: false, error: "سجّل الدخول أولاً." };

  const prop = propertySchema.safeParse(propertyInput(fd));
  if (!prop.success) return { ok: false, error: firstIssue(prop.error) };

  const rest = z
    .object({
      capacity: z.enum(["owner", "authorized_agent"], { message: "حدد صفتك: مالك أو وكيل." }),
      asking_price: priceSchema("السعر المطلوب"),
      deed_number: z
        .string()
        .trim()
        .min(4, "اكتب رقم الصك كما في صك الملكية.")
        .max(40, "رقم الصك طويل جداً."),
      address_note: z.string().trim().max(300, "وصف الموقع طويل جداً."),
      description: z.string().trim().max(3000, "الوصف طويل جداً."),
    })
    .safeParse({
      capacity: str(fd.get("capacity")) || undefined,
      asking_price: optionalNumber(fd.get("asking_price")) ?? undefined,
      deed_number: str(fd.get("deed_number")),
      address_note: str(fd.get("address_note")),
      description: str(fd.get("description")),
    });
  if (!rest.success) return { ok: false, error: firstIssue(rest.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_requests")
    .insert({ ...prop.data, ...rest.data, address_note: rest.data.address_note || null })
    .select("id, ref_no")
    .single();
  if (error) {
    console.error("[request:create]", error.message);
    return { ok: false, error: "تعذّر حفظ الطلب. راجع البيانات وحاول مرة أخرى." };
  }
  return { ok: true, id: data.id, refNo: data.ref_no };
}

/** بعد رفع المرفقات من المتصفح: يرسل التنبيهات ويحدّث الصفحات. */
export async function finalizeMarketingRequest(requestId: string): Promise<{ ok: boolean }> {
  const user = await actionUser();
  if (!user || !z.string().uuid().safeParse(requestId).success) return { ok: false };
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("marketing_requests")
    .select("ref_no, capacity, property_type, purpose, district, area_sqm, asking_price, rent_period, submitter_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!r || r.submitter_id !== user.id) return { ok: false };
  const { count } = await supabase.from("request_files").select("id", { count: "exact", head: true }).eq("request_id", requestId);

  after(async () => {
    await sendMail({
      to: officeEmail(),
      subject: `طلب تسويق جديد رقم ${r.ref_no}: ${PROPERTY_TYPE_LABEL[r.property_type as keyof typeof PROPERTY_TYPE_LABEL]} ${PURPOSE_LABEL[r.purpose as "sale" | "rent"]} في ${r.district}`,
      heading: "طلب تسويق جديد بانتظار الإسناد",
      lines: [
        `مقدم الطلب: ${user.profile.full_name} (${CAPACITY_LABEL[r.capacity as "owner"]}) — ${user.profile.phone}`,
        `العقار: ${PROPERTY_TYPE_LABEL[r.property_type as keyof typeof PROPERTY_TYPE_LABEL]} ${PURPOSE_LABEL[r.purpose as "sale"]}، حي ${r.district}، ${formatArea(r.area_sqm)}`,
        `السعر المطلوب: ${formatPrice(r.asking_price, r.rent_period)}`,
        `المرفقات: ${count ?? 0}`,
      ],
      action: { label: "افتح الطلب", path: `/dashboard/requests/${requestId}` },
    });
    await sendMail({
      to: user.email,
      subject: `استلمنا طلب تسويق عقارك (رقم ${r.ref_no})`,
      heading: "استلمنا طلبك",
      lines: [
        `رقم الطلب: ${r.ref_no}`,
        "سيراجع أحد وسطائنا البيانات والصك ويتواصل معك. تتابع حالة الطلب من حسابك.",
      ],
      action: { label: "تابع الطلب", path: `/account/requests/${requestId}` },
    });
  });

  revalidatePath("/account");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** إضافة مرفقات لاحقاً لطلب قائم */
export async function refreshRequest(requestId: string) {
  if (!z.string().uuid().safeParse(requestId).success) return;
  revalidatePath(`/account/requests/${requestId}`);
  revalidatePath(`/dashboard/requests/${requestId}`);
}
