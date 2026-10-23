import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestFile } from "../types";
import type { SignedFile } from "@/components/FileGrid";

/** روابط موقّعة مؤقتة لمرفقات الطلب (التخزين الخاص) */
export async function signRequestFiles(supabase: SupabaseClient, files: RequestFile[]): Promise<SignedFile[]> {
  if (files.length === 0) return [];
  const { data } = await supabase.storage.from("request-files").createSignedUrls(
    files.map((f) => f.storage_path),
    60 * 60,
  );
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return files.map((f) => ({ ...f, url: map.get(f.storage_path) ?? null }));
}
