import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";
import type { Profile } from "./types";

export type SessionUser = { id: string; email: string | null; profile: Profile };

/** المستخدم الحالي وملفه، أو null. يُحسب مرة واحدة لكل طلب. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, role, is_active, created_at")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) return null;
  return { id: data.user.id, email: data.user.email ?? null, profile: profile as Profile };
});

export function isStaff(u: SessionUser | null) {
  return !!u && u.profile.is_active && (u.profile.role === "agent" || u.profile.role === "admin");
}

export function isAdmin(u: SessionUser | null) {
  return !!u && u.profile.is_active && u.profile.role === "admin";
}

export async function requireUser(next = "/account") {
  const u = await getSessionUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireStaff() {
  const u = await getSessionUser();
  if (!u) redirect("/login?next=/dashboard");
  if (!isStaff(u)) redirect("/account");
  return u;
}

export async function requireAdmin() {
  const u = await requireStaff();
  if (!isAdmin(u)) redirect("/dashboard");
  return u;
}

/** للإجراءات (Server Actions): لا تعيد توجيه، بل تُرجع الخطأ. */
export async function actionUser() {
  const u = await getSessionUser();
  return u;
}

export function safeNext(next: unknown, fallback = "/account") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
