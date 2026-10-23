import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/**
 * عميل بدون جلسة للبيانات العامة (العروض المنشورة، إعدادات المكتب).
 * التخزين المؤقت يتم في طبقة "use cache" فقط، لذا نمنع ذاكرة fetch في Next
 * حتى لا تبقى بيانات قديمة بين عمليات النشر.
 */
export function createPublicClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
