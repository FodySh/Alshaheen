"use client";
import { useState } from "react";
import { ShareIcon } from "../icons";

/** مشاركة رابط العقار: قائمة المشاركة في الجوال، أو نسخ الرابط على الحاسب */
export function ShareButton({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* ألغى المستخدم المشاركة */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* المتصفح يمنع النسخ */
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium underline underline-offset-4 hover:bg-sand"
    >
      <ShareIcon />
      <span aria-live="polite">{copied ? "نُسخ الرابط" : "مشاركة"}</span>
    </button>
  );
}
