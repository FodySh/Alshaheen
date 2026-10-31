import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_OPTIONS,
  LAST_SEEN_COOKIE,
  LAST_SEEN_COOKIE_OPTIONS,
  checkSession,
  isProtectedPath,
  parseLastSeen,
  shouldWriteLastSeen,
  type SessionClaims,
} from "../session";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/** يجدد جلسة Supabase مع كل طلب، ويُنهيها عند تجاوز مدة الخمول أو العمر الأقصى. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // لا تضع أي كود بين إنشاء العميل وهذا السطر
  const { data } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? null) as SessionClaims | null;
  const lastSeen = parseLastSeen(request.cookies.get(LAST_SEEN_COOKIE)?.value);
  const now = Date.now();

  if (!claims) {
    if (lastSeen !== null) response.cookies.delete(LAST_SEEN_COOKIE);
    return response;
  }

  const verdict = checkSession(claims, lastSeen, now);
  if (!verdict.ok) {
    // يلغي الجلسة على خادم Supabase أيضاً، فلا يصلح رمز التجديد بعدها
    await supabase.auth.signOut({ scope: "local" });
    request.cookies.delete(LAST_SEEN_COOKIE);
    if (isProtectedPath(request.nextUrl.pathname)) {
      const url = new URL("/login", request.url);
      url.searchParams.set("expired", verdict.reason);
      url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      const redirect = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      response = redirect;
    }
    response.cookies.delete(LAST_SEEN_COOKIE);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (shouldWriteLastSeen(lastSeen, now)) {
    response.cookies.set(LAST_SEEN_COOKIE, String(now), LAST_SEEN_COOKIE_OPTIONS);
  }
  return response;
}
