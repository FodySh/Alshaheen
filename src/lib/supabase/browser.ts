"use client";
import { createBrowserClient } from "@supabase/ssr";
import { AUTH_COOKIE_OPTIONS } from "../session";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY, { cookieOptions: AUTH_COOKIE_OPTIONS });
}
