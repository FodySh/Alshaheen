"use client";
import { useState } from "react";

/** نص طويل يُطوى بعد 6 أسطر مع زر «عرض المزيد» */
export function ExpandableText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 420 || text.split("\n").length > 6;
  return (
    <div>
      <p className={`whitespace-pre-line leading-8 ${long && !open ? "line-clamp-6" : ""}`}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-3 font-medium underline underline-offset-4 hover:text-ink-soft"
        >
          {open ? "عرض أقل" : "عرض المزيد"}
        </button>
      )}
    </div>
  );
}
