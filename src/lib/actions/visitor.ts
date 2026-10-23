"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionUser } from "../auth";
import { createClient } from "../supabase/server";
import { getProfileEmail } from "../supabase/admin";
import { officeEmail, sendMail } from "../email";
import { formatDay, formatTime } from "../format";
import type { ActionState } from "../types";

const uuid = z.string().uuid();

function dbError(message: string | undefined) {
  // رسائل الدوال في قاعدة البيانات مكتوبة بالعربية للمستخدم مباشرة
  if (message && /[؀-ۿ]/.test(message)) return message;
  return "تعذّر إتمام العملية. حاول مرة أخرى.";
}

export async function createInquiry(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const user = await actionUser();
  if (!user) return { error: "سجّل الدخول لإرسال الاستفسار." };

  const parsed = z
    .object({
      listing_id: uuid,
      message: z.string().trim().min(5, "اكتب استفسارك (5 أحرف على الأقل).").max(2000, "الاستفسار طويل جداً."),
    })
    .safeParse({ listing_id: fd.get("listing_id"), message: fd.get("message") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .insert(parsed.data)
    .select("ref_no, assigned_to")
    .single();
  if (error) return { error: dbError(error.message) };

  const { data: listing } = await supabase.from("listings").select("title, ref_no").eq("id", parsed.data.listing_id).maybeSingle();

  after(async () => {
    const agentEmail = await getProfileEmail(data.assigned_to);
    await sendMail({
      to: agentEmail ?? officeEmail(),
      subject: `استفسار جديد على العرض ${listing?.ref_no ?? ""}`,
      heading: "استفسار جديد",
      lines: [
        `العرض: ${listing?.title ?? ""}`,
        `من: ${user.profile.full_name} — ${user.profile.phone}`,
        `الاستفسار: ${parsed.data.message}`,
      ],
      action: { label: "افتح الاستفسارات", path: "/dashboard/inquiries" },
    });
  });

  revalidatePath("/account");
  return { ok: true, message: `أرسلنا استفسارك (رقم ${data.ref_no}). يصلك الرد في حسابك وعلى بريدك.` };
}

export async function bookViewing(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const user = await actionUser();
  if (!user) return { error: "سجّل الدخول لحجز موعد." };

  const parsed = z
    .object({
      listing_id: uuid,
      slot_id: z.string({ message: "اختر موعداً من المواعيد المتاحة." }).uuid("اختر موعداً من المواعيد المتاحة."),
      note: z.string().trim().max(500, "الملاحظة طويلة جداً.").optional(),
    })
    .safeParse({
      listing_id: fd.get("listing_id"),
      slot_id: fd.get("slot_id") ?? undefined,
      note: (fd.get("note") as string | null) ?? undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: bookingId, error } = await supabase.rpc("book_viewing", {
    p_listing: parsed.data.listing_id,
    p_slot: parsed.data.slot_id,
    p_note: parsed.data.note ?? null,
  });
  if (error) return { error: dbError(error.message) };

  const { data: b } = await supabase
    .from("bookings")
    .select("ref_no, starts_at, agent_id, listing_id")
    .eq("id", bookingId as string)
    .single();
  const { data: listing } = await supabase.from("listings").select("title, district").eq("id", parsed.data.listing_id).maybeSingle();
  const when = b ? `${formatDay(b.starts_at)} الساعة ${formatTime(b.starts_at)}` : "";

  after(async () => {
    const agentEmail = await getProfileEmail(b?.agent_id);
    await sendMail({
      to: agentEmail ?? officeEmail(),
      subject: `حجز معاينة جديد — ${when}`,
      heading: "حجز معاينة جديد",
      lines: [
        `العقار: ${listing?.title ?? ""} (${listing?.district ?? ""})`,
        `الموعد: ${when}`,
        `الزائر: ${user.profile.full_name} — ${user.profile.phone}`,
        parsed.data.note ? `ملاحظة: ${parsed.data.note}` : "",
      ].filter(Boolean),
      action: { label: "افتح المعاينات", path: "/dashboard/bookings" },
    });
    await sendMail({
      to: user.email,
      subject: `تأكيد موعد المعاينة — ${when}`,
      heading: "تم تأكيد موعد المعاينة",
      lines: [
        `العقار: ${listing?.title ?? ""} (${listing?.district ?? ""})`,
        `الموعد: ${when}`,
        "سيتواصل معك الوسيط لتأكيد موقع اللقاء. يمكنك إلغاء الموعد من حسابك.",
      ],
      action: { label: "مواعيدي", path: "/account#bookings" },
    });
  });

  revalidatePath("/account");
  revalidatePath(`/listings/${parsed.data.listing_id}`);
  return { ok: true, message: `تم الحجز (رقم ${b?.ref_no ?? ""}): ${when}. أرسلنا التأكيد إلى بريدك.` };
}

export async function cancelMyBooking(fd: FormData) {
  const user = await actionUser();
  if (!user) return;
  const id = uuid.safeParse(fd.get("booking_id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { data: b } = await supabase.from("bookings").select("agent_id, starts_at, ref_no").eq("id", id.data).maybeSingle();
  const { error } = await supabase.rpc("cancel_booking", { p_booking: id.data, p_reason: null });
  if (!error && b) {
    after(async () => {
      const agentEmail = await getProfileEmail(b.agent_id);
      await sendMail({
        to: agentEmail ?? officeEmail(),
        subject: `ألغى الزائر موعد المعاينة ${b.ref_no}`,
        heading: "إلغاء موعد معاينة",
        lines: [`ألغى ${user.profile.full_name} موعد ${formatDay(b.starts_at)} الساعة ${formatTime(b.starts_at)}.`, "أصبح الموعد متاحاً للحجز مجدداً."],
        action: { label: "افتح المعاينات", path: "/dashboard/bookings" },
      });
    });
  }
  revalidatePath("/account");
}

export async function updateMyProfile(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const user = await actionUser();
  if (!user) return { error: "سجّل الدخول أولاً." };
  const parsed = z
    .object({
      full_name: z.string().trim().min(3, "اكتب الاسم الكامل.").max(100),
      phone: z.string().trim().regex(/^05\d{8}$/, "رقم الجوال بصيغة 05xxxxxxxx."),
    })
    .safeParse({ full_name: fd.get("full_name"), phone: fd.get("phone") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: dbError(error.message) };
  revalidatePath("/account");
  return { ok: true, message: "حُفظت بياناتك." };
}

export async function submitComplaint(_: ActionState | null, fd: FormData): Promise<ActionState> {
  if (fd.get("website")) return { ok: true, message: "استلمنا شكواك." }; // مصيدة الروبوتات
  const parsed = z
    .object({
      name: z.string().trim().min(2, "اكتب اسمك.").max(100),
      phone: z.string().trim().regex(/^0?5\d{8}$|^\+?9665\d{8}$/, "اكتب رقم جوال سعودي صحيح."),
      email: z.union([z.literal(""), z.string().trim().email("البريد غير صحيح.")]),
      listing_ref: z.string().trim().max(40),
      subject: z.string().trim().min(3, "اكتب عنوان الشكوى.").max(150),
      body: z.string().trim().min(10, "اشرح الشكوى (10 أحرف على الأقل).").max(3000),
    })
    .safeParse(Object.fromEntries(["name", "phone", "email", "listing_ref", "subject", "body"].map((k) => [k, fd.get(k) ?? ""])));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const d = parsed.data;
  const { data: refNo, error } = await supabase.rpc("submit_complaint", {
    p_name: d.name,
    p_phone: d.phone,
    p_email: d.email,
    p_listing_ref: d.listing_ref,
    p_subject: d.subject,
    p_body: d.body,
  });
  if (error) return { error: dbError(error.message) };

  after(() =>
    sendMail({
      to: officeEmail(),
      subject: `شكوى جديدة رقم ${refNo}: ${d.subject}`,
      heading: "شكوى جديدة",
      lines: [`من: ${d.name} — ${d.phone}`, d.listing_ref ? `العرض: ${d.listing_ref}` : "", d.body].filter(Boolean),
      action: { label: "افتح الشكاوى", path: "/dashboard/complaints" },
    }),
  );
  return { ok: true, message: `استلمنا شكواك برقم ${refNo}. سنتواصل معك على رقم جوالك.` };
}
