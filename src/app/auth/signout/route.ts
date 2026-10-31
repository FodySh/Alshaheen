import { NextResponse, type NextRequest } from "next/server";
import { clearSessionActivity } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // نموذج من موقع آخر لا يستطيع تسجيل خروج المستخدم (CSRF)
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if ((origin && origin !== request.nextUrl.origin) || site === "cross-site") {
    return new Response("Forbidden", { status: 403 });
  }
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  await clearSessionActivity();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
