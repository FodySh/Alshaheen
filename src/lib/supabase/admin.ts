import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * مفتاح الخادم السري يتجاوز RLS. استخدامه محصور في قراءة بريد الموظف
 * المستلم للتنبيه. لا تستخدمه لأي كتابة.
 */
export async function getProfileEmail(userId: string | null | undefined): Promise<string | null> {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!userId || !key || !SUPABASE_URL) return null;
  const admin = createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  return data?.email ?? null;
}
