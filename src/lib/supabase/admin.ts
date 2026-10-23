import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * مفتاح الخادم السري يتجاوز RLS. استخدامه محصور في قراءة بريد مستلمي التنبيهات،
 * وفي المهمة المجدولة لتنبيه تجديد العقود. لا تستخدمه في أي مسار يتحكم به المستخدم.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !SUPABASE_URL) return null;
  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

export async function getProfileEmail(userId: string | null | undefined): Promise<string | null> {
  const admin = createAdminClient();
  if (!userId || !admin) return null;
  const { data } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  return data?.email ?? null;
}
