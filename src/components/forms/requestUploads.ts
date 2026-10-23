"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { compressImage, extFor, MAX_FILE_BYTES, randomName } from "@/lib/image";
import type { RequestFileKind } from "@/lib/types";

export type PendingFile = { file: File; kind: RequestFileKind };

/**
 * يرفع مرفقات الطلب مباشرة من المتصفح إلى التخزين الخاص ثم يسجلها.
 * المسار: {user}/{request}/{uuid}.{ext} — تفرضه سياسات التخزين.
 */
export async function uploadRequestFiles(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  files: PendingFile[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ uploaded: number; failed: string[] }> {
  const failed: string[] = [];
  let uploaded = 0;
  for (let i = 0; i < files.length; i++) {
    const { file, kind } = files[i];
    try {
      const blob = kind === "photo" ? await compressImage(file) : file;
      if (blob.size > MAX_FILE_BYTES) throw new Error("الملف أكبر من 10 ميجابايت");
      const path = `${userId}/${requestId}/${randomName(extFor(blob, file.name))}`;
      const { error: upErr } = await supabase.storage
        .from("request-files")
        .upload(path, blob, { contentType: blob.type || file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: rowErr } = await supabase
        .from("request_files")
        .insert({ request_id: requestId, kind, storage_path: path, file_name: file.name.slice(0, 200) });
      if (rowErr) throw rowErr;
      uploaded++;
    } catch {
      failed.push(file.name);
    }
    onProgress?.(i + 1, files.length);
  }
  return { uploaded, failed };
}
