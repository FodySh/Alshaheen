import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** عميل بجلسة المستخدم الحالي — كل الاستعلامات تخضع لسياسات RLS. */
export async function createClient() {
  // مكتبة الدخول تقرأ الوقت الحالي للتحقق من صلاحية الجلسة، فنستبعد هذا الجزء من التحميل المسبق
  await connection();
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // من داخل Server Component لا يمكن كتابة الكوكيز؛ الـ proxy يتولى تحديث الجلسة.
        }
      },
    },
  });
}
