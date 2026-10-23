"use server";

import { after } from "next/server";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionUser, isAdmin, isStaff } from "../auth";
import {
  FEATURES,
  PROPERTY_TYPE_LABEL,
  PURPOSE_LABEL,
  REQUEST_STATUS_HELP,
  REQUEST_STATUS_LABEL,
} from "../constants";
import { sendMail } from "../email";
import { formatDay, formatTime, riyadhToday } from "../format";
import { normalizeDigits, optionalNumber, str } from "../parse";
import { createClient } from "../supabase/server";
import type { ActionState, MarketingRequest, RequestStatus } from "../types";
import { firstIssue, priceSchema, propertyInput, propertySchema } from "../validation";

const uuid = z.string().uuid();

function dbError(message: string | undefined) {
  if (message && /[؀-ۿ]/.test(message)) return message;
  if (message?.includes("row-level security") || message?.includes("permission denied")) return "ليست لديك صلاحية لهذا الإجراء.";
  return "تعذّر إتمام العملية. حاول مرة أخرى.";
}

async function staffOrError() {
  const u = await actionUser();
  if (!isStaff(u)) return { user: null, error: "هذا الإجراء لموظفي المكتب فقط." } as const;
  return { user: u!, error: null } as const;
}

async function emailOf(supabase: Awaited<ReturnType<typeof createClient>>, userId: string | null | undefined) {
  if (!userId) return null;
  const { data } = await supabase.from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
  return data as { email: string | null; full_name: string } | null;
}

function refreshDashboard() {
  revalidatePath("/dashboard", "layout");
}

// =============================================================
// طلبات التسويق
// =============================================================

export async function assignRequest(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const u = await actionUser();
  if (!isAdmin(u)) return { error: "الإسناد للمدير فقط." };
  const requestId = uuid.safeParse(fd.get("request_id"));
  const agentId = uuid.safeParse(fd.get("agent_id"));
  if (!requestId.success || !agentId.success) return { error: "اختر الموظف." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_request", { p_request: requestId.data, p_agent: agentId.data });
  if (error) return { error: dbError(error.message) };

  const { data: r } = await supabase.from("marketing_requests").select("ref_no, property_type, purpose, district").eq("id", requestId.data).single();
  const agent = await emailOf(supabase, agentId.data);
  if (agentId.data !== u!.id) {
    after(() =>
      sendMail({
        to: agent?.email,
        subject: `أُسند إليك طلب التسويق رقم ${r?.ref_no}`,
        heading: "طلب تسويق جديد بانتظارك",
        lines: [`${PROPERTY_TYPE_LABEL[r?.property_type as keyof typeof PROPERTY_TYPE_LABEL] ?? ""} ${PURPOSE_LABEL[r?.purpose as "sale"] ?? ""} في ${r?.district ?? ""}.`, "راجع البيانات والصك وتواصل مع مقدم الطلب."],
        action: { label: "افتح الطلب", path: `/dashboard/requests/${requestId.data}` },
      }),
    );
  }
  refreshDashboard();
  return { ok: true, message: `أُسند الطلب إلى ${agent?.full_name ?? "الموظف"}.` };
}

const STATUS_VALUES = ["new", "under_review", "awaiting_license", "closed", "rejected"] as const;

export async function setRequestStatus(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const { error: authErr } = await staffOrError();
  if (authErr) return { error: authErr };
  const parsed = z
    .object({
      request_id: uuid,
      status: z.enum(STATUS_VALUES, { message: "اختر الحالة." }),
      note: z.string().trim().max(1000),
      internal: z.boolean(),
    })
    .safeParse({
      request_id: fd.get("request_id"),
      status: fd.get("status"),
      note: str(fd.get("note")),
      internal: fd.get("internal") === "on",
    });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_request_status", {
    p_request: d.request_id,
    p_status: d.status,
    p_note: d.note || null,
    p_internal: d.internal,
  });
  if (error) return { error: dbError(error.message) };

  const visible = !d.internal || d.status === "rejected";
  if (visible) {
    const { data: r } = await supabase.from("marketing_requests").select("ref_no, submitter_id").eq("id", d.request_id).single();
    const submitter = await emailOf(supabase, r?.submitter_id);
    after(() =>
      sendMail({
        to: submitter?.email,
        subject: `تحديث على طلبك رقم ${r?.ref_no}: ${REQUEST_STATUS_LABEL[d.status as RequestStatus]}`,
        heading: `حالة طلبك الآن: ${REQUEST_STATUS_LABEL[d.status as RequestStatus]}`,
        lines: [REQUEST_STATUS_HELP[d.status as RequestStatus], d.note ? `ملاحظة المكتب: ${d.note}` : ""].filter(Boolean),
        action: { label: "تابع الطلب", path: `/account/requests/${d.request_id}` },
      }),
    );
  }
  refreshDashboard();
  revalidatePath(`/account/requests/${d.request_id}`);
  return { ok: true, message: "حُدّثت الحالة." };
}

export async function addRequestNote(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const { error: authErr } = await staffOrError();
  if (authErr) return { error: authErr };
  const requestId = uuid.safeParse(fd.get("request_id"));
  const note = str(fd.get("note"));
  if (!requestId.success || note.length < 2) return { error: "اكتب الملاحظة." };
  const internal = fd.get("visible") !== "on";
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_request_note", { p_request: requestId.data, p_note: note.slice(0, 1000), p_internal: internal });
  if (error) return { error: dbError(error.message) };
  if (!internal) {
    const { data: r } = await supabase.from("marketing_requests").select("ref_no, submitter_id").eq("id", requestId.data).single();
    const submitter = await emailOf(supabase, r?.submitter_id);
    after(() =>
      sendMail({
        to: submitter?.email,
        subject: `رسالة من المكتب بخصوص طلبك رقم ${r?.ref_no}`,
        heading: "رسالة جديدة على طلبك",
        lines: [note],
        action: { label: "تابع الطلب", path: `/account/requests/${requestId.data}` },
      }),
    );
  }
  revalidatePath(`/dashboard/requests/${requestId.data}`);
  revalidatePath(`/account/requests/${requestId.data}`);
  return { ok: true, message: internal ? "أُضيفت الملاحظة الداخلية." : "أُرسلت الرسالة لمقدم الطلب." };
}

/** ينشئ مسودة عرض من الطلب وينسخ صوره إلى التخزين العام */
export async function createListingFromRequest(fd: FormData) {
  const { user, error: authErr } = await staffOrError();
  if (authErr) return;
  const requestId = uuid.safeParse(fd.get("request_id"));
  if (!requestId.success) return;
  const supabase = await createClient();

  const { data: existing } = await supabase.from("listings").select("id").eq("request_id", requestId.data).maybeSingle();
  if (existing) redirect(`/dashboard/listings/${existing.id}`);

  const { data } = await supabase.from("marketing_requests").select("*").eq("id", requestId.data).maybeSingle();
  if (!data) return;
  const r = data as MarketingRequest;
  const agentId = isAdmin(user) ? (r.assigned_to ?? user.id) : user.id;

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      request_id: r.id,
      title: `${PROPERTY_TYPE_LABEL[r.property_type]} ${PURPOSE_LABEL[r.purpose]} في حي ${r.district}`,
      description: r.description,
      property_type: r.property_type,
      purpose: r.purpose,
      district: r.district,
      area_sqm: r.area_sqm,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      age_years: r.age_years,
      street_width_m: r.street_width_m,
      facade: r.facade,
      price: r.asking_price,
      rent_period: r.rent_period,
      agent_id: agentId,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !listing) {
    console.error("[listing:fromRequest]", error?.message);
    redirect(`/dashboard/requests/${r.id}?error=listing`);
  }

  // نسخ الصور
  const { data: photos } = await supabase
    .from("request_files")
    .select("storage_path")
    .eq("request_id", r.id)
    .eq("kind", "photo")
    .order("created_at");
  let order = 0;
  let cover: string | null = null;
  for (const p of photos ?? []) {
    const ext = p.storage_path.split(".").pop() ?? "webp";
    const dest = `${listing.id}/${crypto.randomUUID()}.${ext}`;
    const { error: cpErr } = await supabase.storage
      .from("request-files")
      .copy(p.storage_path, dest, { destinationBucket: "listing-images" });
    if (cpErr) {
      console.error("[listing:copy]", cpErr.message);
      continue;
    }
    await supabase.from("listing_images").insert({ listing_id: listing.id, storage_path: dest, sort_order: order++ });
    cover ??= dest;
  }
  if (cover) await supabase.from("listings").update({ cover_image_path: cover }).eq("id", listing.id);

  await supabase.rpc("add_request_note", { p_request: r.id, p_note: "أُنشئت مسودة العرض", p_internal: true });
  refreshDashboard();
  redirect(`/dashboard/listings/${listing.id}?created=1`);
}

// =============================================================
// العروض
// =============================================================

export async function saveListing(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const { user, error: authErr } = await staffOrError();
  if (authErr) return { error: authErr };

  const intent = str(fd.get("intent")) as "save" | "publish" | "unpublish";
  const id = str(fd.get("id"));

  const prop = propertySchema.safeParse(propertyInput(fd));
  if (!prop.success) return { error: firstIssue(prop.error) };

  const rest = z
    .object({
      title: z.string().trim().min(5, "العنوان 5 أحرف على الأقل.").max(120, "العنوان أطول من 120 حرفاً."),
      description: z.string().trim().max(5000),
      price: priceSchema("السعر"),
      map_url: z.union([z.literal(""), z.string().trim().url("رابط الخريطة غير صحيح.").max(500)]),
      ad_license_number: z.string().trim().max(40),
      ad_license_expiry: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ الانتهاء غير صحيح.")]),
      features: z.array(z.enum(FEATURES as [string, ...string[]])),
    })
    .safeParse({
      title: str(fd.get("title")),
      description: str(fd.get("description")),
      price: optionalNumber(fd.get("price")) ?? undefined,
      map_url: str(fd.get("map_url")),
      ad_license_number: normalizeDigits(fd.get("ad_license_number")),
      ad_license_expiry: str(fd.get("ad_license_expiry")),
      features: fd.getAll("features").map(String),
    });
  if (!rest.success) return { error: firstIssue(rest.error) };
  const d = rest.data;

  if (intent === "publish") {
    if (!d.ad_license_number) return { error: "اكتب رقم ترخيص الإعلان قبل النشر." };
    if (!d.ad_license_expiry) return { error: "اكتب تاريخ انتهاء ترخيص الإعلان قبل النشر." };
    if (d.ad_license_expiry < riyadhToday()) return { error: "تاريخ انتهاء الترخيص مضى. حدّث بيانات الترخيص." };
  }

  const values: Record<string, unknown> = {
    ...prop.data,
    title: d.title,
    description: d.description,
    price: d.price,
    map_url: d.map_url || null,
    ad_license_number: d.ad_license_number || null,
    ad_license_expiry: d.ad_license_expiry || null,
    features: d.features,
  };
  if (intent === "publish") values.status = "published";
  if (intent === "unpublish") values.status = "draft";

  const agentField = str(fd.get("agent_id"));
  if (isAdmin(user) && uuid.safeParse(agentField).success) values.agent_id = agentField;

  const supabase = await createClient();
  let listingId = id;
  if (id) {
    const { error } = await supabase.from("listings").update(values).eq("id", id);
    if (error) return { error: dbError(error.message) };
  } else {
    values.agent_id ??= user.id;
    values.status ??= "draft";
    const { data, error } = await supabase.from("listings").insert(values).select("id").single();
    if (error) return { error: dbError(error.message) };
    listingId = data.id;
  }

  updateTag("listings");
  refreshDashboard();
  if (!id) redirect(`/dashboard/listings/${listingId}?created=1`);
  return {
    ok: true,
    message: intent === "publish" ? "نُشر العرض." : intent === "unpublish" ? "أُخفي العرض وأصبح مسودة." : "حُفظت التعديلات.",
  };
}

export async function setListingStatus(fd: FormData) {
  const { error: authErr } = await staffOrError();
  if (authErr) return;
  const id = uuid.safeParse(fd.get("id"));
  const status = z.enum(["sold", "rented", "archived", "draft"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return;
  const supabase = await createClient();
  await supabase.from("listings").update({ status: status.data }).eq("id", id.data);
  updateTag("listings");
  refreshDashboard();
}

export async function deleteListing(fd: FormData) {
  const u = await actionUser();
  if (!isAdmin(u)) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { data: imgs } = await supabase.from("listing_images").select("storage_path").eq("listing_id", id.data);
  const { error } = await supabase.from("listings").delete().eq("id", id.data);
  if (!error && imgs?.length) await supabase.storage.from("listing-images").remove(imgs.map((i) => i.storage_path));
  updateTag("listings");
  refreshDashboard();
  redirect("/dashboard/listings");
}

/** بعد رفع الصور أو حذفها أو ترتيبها: يضبط صورة الغلاف ويحدّث الصفحات العامة */
export async function syncListingImages(listingId: string) {
  const { error: authErr } = await staffOrError();
  if (authErr || !uuid.safeParse(listingId).success) return;
  const supabase = await createClient();
  const { data: imgs } = await supabase
    .from("listing_images")
    .select("id, storage_path, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order")
    .order("created_at");
  // إعادة ترقيم متتالية
  for (const [i, img] of (imgs ?? []).entries()) {
    if (img.sort_order !== i) await supabase.from("listing_images").update({ sort_order: i }).eq("id", img.id);
  }
  await supabase.from("listings").update({ cover_image_path: imgs?.[0]?.storage_path ?? null }).eq("id", listingId);
  updateTag("listings");
  revalidatePath(`/dashboard/listings/${listingId}`);
}

export async function moveListingImage(fd: FormData) {
  const { error: authErr } = await staffOrError();
  if (authErr) return;
  const listingId = uuid.safeParse(fd.get("listing_id"));
  const imageId = uuid.safeParse(fd.get("image_id"));
  const dir = fd.get("dir") === "up" ? -1 : fd.get("dir") === "first" ? -1000 : 1;
  if (!listingId.success || !imageId.success) return;
  const supabase = await createClient();
  const { data: imgs } = await supabase.from("listing_images").select("id").eq("listing_id", listingId.data).order("sort_order").order("created_at");
  const list = (imgs ?? []).map((x) => x.id);
  const from = list.indexOf(imageId.data);
  if (from < 0) return;
  const to = Math.max(0, Math.min(list.length - 1, from + dir));
  list.splice(to, 0, ...list.splice(from, 1));
  for (const [i, imgId] of list.entries()) await supabase.from("listing_images").update({ sort_order: i }).eq("id", imgId);
  await syncListingImages(listingId.data);
}

export async function deleteListingImage(fd: FormData) {
  const { error: authErr } = await staffOrError();
  if (authErr) return;
  const listingId = uuid.safeParse(fd.get("listing_id"));
  const imageId = uuid.safeParse(fd.get("image_id"));
  if (!listingId.success || !imageId.success) return;
  const supabase = await createClient();
  const { data: img } = await supabase.from("listing_images").select("storage_path").eq("id", imageId.data).maybeSingle();
  if (!img) return;
  const { error } = await supabase.from("listing_images").delete().eq("id", imageId.data);
  if (!error) await supabase.storage.from("listing-images").remove([img.storage_path]);
  await syncListingImages(listingId.data);
}

// =============================================================
// الاستفسارات
// =============================================================

export async function replyInquiry(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const { error: authErr } = await staffOrError();
  if (authErr) return { error: authErr };
  const id = uuid.safeParse(fd.get("id"));
  const reply = str(fd.get("reply"));
  const close = fd.get("close") === "on";
  if (!id.success) return { error: "استفسار غير صالح." };
  if (reply.length < 2 && !close) return { error: "اكتب الرد." };
  const supabase = await createClient();
  const patch: Record<string, string> = {};
  if (reply) patch.reply = reply.slice(0, 2000);
  if (close) patch.status = "closed";
  else if (reply) patch.status = "replied";
  const { data, error } = await supabase.from("inquiries").update(patch).eq("id", id.data).select("user_id, ref_no, listing_id").single();
  if (error) return { error: dbError(error.message) };
  if (reply) {
    const visitor = await emailOf(supabase, data.user_id);
    const { data: l } = await supabase.from("listings").select("title").eq("id", data.listing_id).maybeSingle();
    after(() =>
      sendMail({
        to: visitor?.email,
        subject: `رد المكتب على استفسارك رقم ${data.ref_no}`,
        heading: "رد على استفسارك",
        lines: [`العرض: ${l?.title ?? ""}`, reply],
        action: { label: "استفساراتي", path: "/account#inquiries" },
      }),
    );
  }
  refreshDashboard();
  return { ok: true, message: reply ? "أُرسل الرد." : "أُغلق الاستفسار." };
}

// =============================================================
// المعاينات والمواعيد
// =============================================================

export async function staffCancelBooking(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const { error: authErr } = await staffOrError();
  if (authErr) return { error: authErr };
  const id = uuid.safeParse(fd.get("id"));
  const reason = str(fd.get("reason"));
  if (!id.success) return { error: "حجز غير صالح." };
  if (reason.length < 3) return { error: "اكتب سبب الإلغاء ليصل للزائر." };
  const supabase = await createClient();
  const { data: b } = await supabase.from("bookings").select("visitor_id, starts_at, ref_no, listing_id").eq("id", id.data).single();
  const { error } = await supabase.rpc("cancel_booking", { p_booking: id.data, p_reason: reason });
  if (error) return { error: dbError(error.message) };
  const visitor = await emailOf(supabase, b?.visitor_id);
  after(() =>
    sendMail({
      to: visitor?.email,
      subject: `أُلغي موعد المعاينة ${b?.ref_no}`,
      heading: "أُلغي موعد المعاينة",
      lines: [
        b ? `الموعد: ${formatDay(b.starts_at)} الساعة ${formatTime(b.starts_at)}` : "",
        `السبب: ${reason}`,
        "يمكنك حجز موعد آخر من صفحة العرض.",
      ].filter(Boolean),
      action: b ? { label: "صفحة العرض", path: `/listings/${b.listing_id}` } : undefined,
    }),
  );
  refreshDashboard();
  return { ok: true, message: "أُلغي الحجز وأُبلغ الزائر." };
}

export async function setBookingOutcome(fd: FormData) {
  const { error: authErr } = await staffOrError();
  if (authErr) return;
  const id = uuid.safeParse(fd.get("id"));
  const status = z.enum(["completed", "no_show"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return;
  const supabase = await createClient();
  await supabase.rpc("set_booking_outcome", { p_booking: id.data, p_status: status.data, p_note: null });
  refreshDashboard();
}

/** تحويل وقت محلي بتوقيت الرياض (UTC+3 طوال السنة) إلى ISO */
function riyadhToIso(date: string, hhmm: string) {
  return new Date(`${date}T${hhmm}:00+03:00`).toISOString();
}

export async function createSlots(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const { user, error: authErr } = await staffOrError();
  if (authErr) return { error: authErr };
  const parsed = z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "اختر التاريخ."),
      from: z.string().regex(/^\d{2}:\d{2}$/, "اختر وقت البداية."),
      to: z.string().regex(/^\d{2}:\d{2}$/, "اختر وقت النهاية."),
      duration: z.coerce.number().refine((v) => [30, 45, 60, 90].includes(v), "مدة غير صالحة."),
      weeks: z.coerce.number().int().min(0).max(8),
    })
    .safeParse({
      date: fd.get("date"),
      from: fd.get("from"),
      to: fd.get("to"),
      duration: fd.get("duration"),
      weeks: fd.get("weeks") ?? 0,
    });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;
  if (d.to <= d.from) return { error: "وقت النهاية يجب أن يكون بعد وقت البداية." };
  if (d.date < riyadhToday()) return { error: "اختر تاريخاً اليوم أو بعده." };

  const agentField = str(fd.get("agent_id"));
  const agentId = isAdmin(user) && uuid.safeParse(agentField).success ? agentField : user.id;

  const rows: { agent_id: string; starts_at: string; ends_at: string }[] = [];
  for (let w = 0; w <= d.weeks; w++) {
    const day = new Date(`${d.date}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + w * 7);
    const dateStr = day.toISOString().slice(0, 10);
    let start = new Date(riyadhToIso(dateStr, d.from)).getTime();
    const end = new Date(riyadhToIso(dateStr, d.to)).getTime();
    while (start + d.duration * 60_000 <= end) {
      if (start > Date.now()) {
        rows.push({ agent_id: agentId, starts_at: new Date(start).toISOString(), ends_at: new Date(start + d.duration * 60_000).toISOString() });
      }
      start += d.duration * 60_000;
    }
  }
  if (rows.length === 0) return { error: "لا توجد مواعيد ضمن هذا النطاق. وسّع الوقت أو قلّل المدة." };
  if (rows.length > 300) return { error: "عدد المواعيد كبير جداً. قلّل عدد الأسابيع أو وسّع المدة." };

  const supabase = await createClient();
  const { error } = await supabase.from("availability_slots").upsert(rows, { onConflict: "agent_id,starts_at", ignoreDuplicates: true });
  if (error) return { error: dbError(error.message) };
  refreshDashboard();
  return { ok: true, message: `أُضيف ${rows.length} موعد (المكرر يُتجاهل تلقائياً).` };
}

export async function deleteSlot(fd: FormData) {
  const { error: authErr } = await staffOrError();
  if (authErr) return;
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("availability_slots").delete().eq("id", id.data);
  refreshDashboard();
}

// =============================================================
// الشكاوى (المدير)
// =============================================================

export async function updateComplaint(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const u = await actionUser();
  if (!isAdmin(u)) return { error: "الشكاوى للمدير فقط." };
  const parsed = z
    .object({ id: uuid, status: z.enum(["new", "in_progress", "resolved"]), response: z.string().trim().max(2000) })
    .safeParse({ id: fd.get("id"), status: fd.get("status"), response: str(fd.get("response")) });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("complaints")
    .update({ status: parsed.data.status, response: parsed.data.response || null })
    .eq("id", parsed.data.id)
    .select("email, ref_no, subject")
    .single();
  if (error) return { error: dbError(error.message) };
  if (parsed.data.status === "resolved" && parsed.data.response) {
    after(() =>
      sendMail({
        to: data.email,
        subject: `تمت معالجة شكواك رقم ${data.ref_no}`,
        heading: "تمت معالجة شكواك",
        lines: [`الموضوع: ${data.subject}`, parsed.data.response],
      }),
    );
  }
  refreshDashboard();
  return { ok: true, message: "حُفظت." };
}

// =============================================================
// الفريق والإعدادات (المدير)
// =============================================================

export async function addStaff(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const u = await actionUser();
  if (!isAdmin(u)) return { error: "إدارة الفريق للمدير فقط." };
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email("اكتب بريداً صحيحاً."), role: z.enum(["agent", "admin"]) })
    .safeParse({ email: fd.get("email"), role: fd.get("role") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("id, full_name").ilike("email", parsed.data.email).maybeSingle();
  if (!p) return { error: "لا يوجد حساب بهذا البريد. اطلب من الموظف إنشاء حساب في الموقع أولاً ثم أضفه هنا." };
  const { error } = await supabase.rpc("set_user_role", { p_user: p.id, p_role: parsed.data.role, p_active: true });
  if (error) return { error: dbError(error.message) };
  refreshDashboard();
  return { ok: true, message: `أُضيف ${p.full_name || parsed.data.email} إلى الفريق.` };
}

export async function updateStaff(fd: FormData) {
  const u = await actionUser();
  if (!isAdmin(u)) return;
  const id = uuid.safeParse(fd.get("user_id"));
  const role = z.enum(["visitor", "agent", "admin"]).safeParse(fd.get("role"));
  const active = fd.get("active") !== "false";
  if (!id.success || !role.success) return;
  const supabase = await createClient();
  await supabase.rpc("set_user_role", { p_user: id.data, p_role: role.data, p_active: active });
  refreshDashboard();
}

export async function updateSettings(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const u = await actionUser();
  if (!isAdmin(u)) return { error: "الإعدادات للمدير فقط." };
  const parsed = z
    .object({
      office_name: z.string().trim().min(3, "اكتب اسم المكتب.").max(120),
      fal_license_number: z.string().trim().max(40),
      cr_number: z.string().trim().max(40),
      phone: z.string().trim().max(20),
      whatsapp: z.string().trim().max(20),
      email: z.union([z.literal(""), z.string().trim().email("البريد غير صحيح.")]),
      address: z.string().trim().max(200),
      about: z.string().trim().max(600),
      contract_service_fee: z.string().trim().max(200),
    })
    .safeParse(Object.fromEntries(["office_name", "fal_license_number", "cr_number", "phone", "whatsapp", "email", "address", "about", "contract_service_fee"].map((k) => [k, str(fd.get(k))])));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const values = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, k === "office_name" ? v : normalizeOrNull(k, v)]),
  );
  const supabase = await createClient();
  const { error } = await supabase.from("office_settings").update(values).eq("id", 1);
  if (error) return { error: dbError(error.message) };
  updateTag("settings");
  return { ok: true, message: "حُفظت الإعدادات." };
}

function normalizeOrNull(key: string, v: string) {
  if (!v) return null;
  return ["fal_license_number", "cr_number", "phone", "whatsapp"].includes(key) ? normalizeDigits(v) : v;
}

// =============================================================
// الأحياء (المدير)
// =============================================================

export async function addDistrict(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const u = await actionUser();
  if (!isAdmin(u)) return { error: "إدارة الأحياء للمدير فقط." };
  const name = str(fd.get("name")).replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) return { error: "اكتب اسم الحي (من 2 إلى 60 حرفاً)." };
  const supabase = await createClient();
  const { error } = await supabase.from("districts").insert({ name });
  if (error) {
    if (error.code === "23505") return { error: `حي "${name}" موجود في القائمة.` };
    return { error: dbError(error.message) };
  }
  updateTag("districts");
  revalidatePath("/dashboard/settings");
  return { ok: true, message: `أُضيف حي "${name}".` };
}

export async function deleteDistrict(fd: FormData) {
  const u = await actionUser();
  if (!isAdmin(u)) return;
  const name = str(fd.get("name"));
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("districts").delete().eq("name", name);
  updateTag("districts");
  revalidatePath("/dashboard/settings");
}
