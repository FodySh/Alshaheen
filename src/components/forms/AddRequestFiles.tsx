"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { refreshRequest } from "@/lib/actions/requests";
import { ACCEPT_DOCS } from "@/lib/image";
import { createClient } from "@/lib/supabase/browser";
import type { RequestFileKind } from "@/lib/types";
import { uploadRequestFiles } from "./requestUploads";

export function AddRequestFiles({ userId, requestId }: { userId: string; requestId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<RequestFileKind>("photo");
  const [status, setStatus] = useState<string | null>(null);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).slice(0, 15).map((file) => ({ file, kind }));
    const r = await uploadRequestFiles(createClient(), userId, requestId, files, (d, t) => setStatus(`جارٍ الرفع ${d} من ${t}…`));
    setStatus(r.failed.length ? `تعذّر رفع ${r.failed.length} ملف. تأكد أن الصيغة JPG أو PNG أو PDF وأن الحجم أقل من 10 ميجابايت.` : `رُفع ${r.uploaded} ملف.`);
    await refreshRequest(requestId);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="add-kind" className="label">نوع المرفق</label>
        <select id="add-kind" className="field" value={kind} onChange={(e) => setKind(e.target.value as RequestFileKind)}>
          <option value="photo">صور العقار</option>
          <option value="deed">الصك</option>
          <option value="authorization">الوكالة</option>
          <option value="other">مستند آخر</option>
        </select>
      </div>
      <label className="btn btn-secondary cursor-pointer">
        اختر الملفات
        <input type="file" multiple accept={ACCEPT_DOCS} className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </label>
      {status && <p role="status" className="w-full text-sm text-ink-soft">{status}</p>}
    </div>
  );
}
