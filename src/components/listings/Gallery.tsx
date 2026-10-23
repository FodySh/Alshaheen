"use client";
import { useState } from "react";
import { RoshanMark } from "../brand/Roshan";

export function Gallery({ urls, title }: { urls: string[]; title: string }) {
  const [i, setI] = useState(0);
  if (urls.length === 0)
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-sand">
        <RoshanMark className="h-20 w-auto opacity-40" />
      </div>
    );
  return (
    <div>
      <div className="overflow-hidden rounded-lg bg-sand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[i]} alt={`${title} — صورة ${i + 1} من ${urls.length}`} className="aspect-[16/10] w-full object-cover" />
      </div>
      {urls.length > 1 && (
        <ul className="-mx-1 mt-2 flex gap-2 overflow-x-auto p-1" aria-label="صور العقار">
          {urls.map((u, idx) => (
            <li key={u} className="shrink-0">
              <button
                type="button"
                onClick={() => setI(idx)}
                aria-label={`عرض الصورة ${idx + 1}`}
                aria-current={idx === i}
                className={`block overflow-hidden rounded-md ring-2 ring-offset-2 ring-offset-paper ${idx === i ? "ring-olive" : "ring-transparent hover:ring-stone"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-16 w-24 object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
