"use client";
import { useEffect, useRef, useState } from "react";
import { RoshanMark } from "../brand/Roshan";
import { CloseIcon, GridIcon } from "../icons";

/** صور العقار: فسيفساء على الحاسب، شريط يُسحب على الجوال، ومعرض بملء الشاشة */
export function PhotoMosaic({ urls, title }: { urls: string[]; title: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLUListElement>(null);
  const slides = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const n = urls.length;

  // عدّاد الجوال: الصورة الظاهرة في الشريط
  useEffect(() => {
    const els = slides.current.filter((e): e is HTMLLIElement => !!e);
    if (els.length < 2) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { root: strip.current, threshold: 0.6 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [n]);

  function open(i: number) {
    const d = dialogRef.current;
    if (!d) return;
    d.showModal();
    requestAnimationFrame(() => d.querySelector(`#photo-${i}`)?.scrollIntoView({ block: "start" }));
  }

  if (n === 0)
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-[14px] bg-sand md:aspect-[21/9]">
        <RoshanMark className="h-20 w-auto opacity-40" />
      </div>
    );

  const tiles = n >= 5 ? urls.slice(0, 5) : n >= 3 ? urls.slice(0, 3) : urls;
  const grid =
    n >= 5 ? "grid-cols-4 grid-rows-2" : n >= 3 ? "grid-cols-[2fr_1fr] grid-rows-2" : n === 2 ? "grid-cols-2 grid-rows-1" : "grid-cols-1 grid-rows-1";
  const span = (i: number) => (i === 0 && n >= 5 ? "col-span-2 row-span-2" : i === 0 && n >= 3 ? "row-span-2" : "");

  return (
    <>
      <div className="relative hidden md:block">
        <div className={`grid h-[min(56vh,460px)] gap-2 overflow-hidden rounded-[14px] ${grid}`}>
          {tiles.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => open(i)}
              aria-label={`افتح الصورة ${i + 1} من ${n}`}
              className={`group relative min-h-0 overflow-hidden bg-sand ${span(i)}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt={i === 0 ? title : ""}
                className="size-full object-cover transition duration-200 group-hover:brightness-90"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </button>
          ))}
        </div>
        {n > 1 && (
          <button
            type="button"
            onClick={() => open(0)}
            className="absolute end-6 bottom-6 inline-flex items-center gap-2 rounded-lg border border-ink bg-white px-4 py-1.5 text-sm font-medium shadow-[var(--shadow-air)] hover:bg-sand"
          >
            <GridIcon /> عرض كل الصور
          </button>
        )}
      </div>

      <div className="relative -mx-4 md:hidden">
        <ul ref={strip} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]" aria-label="صور العقار">
          {urls.map((u, i) => (
            <li
              key={u}
              ref={(el) => {
                slides.current[i] = el;
              }}
              data-i={i}
              className="w-full shrink-0 snap-center"
            >
              <button type="button" onClick={() => open(i)} className="block w-full" aria-label={`افتح الصورة ${i + 1} من ${n}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={i === 0 ? title : ""} className="aspect-[4/3] w-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
              </button>
            </li>
          ))}
        </ul>
        {n > 1 && (
          <span className="num absolute end-3 bottom-3 rounded-md bg-black/65 px-2 py-0.5 text-xs font-medium text-white" aria-hidden>
            {active + 1} / {n}
          </span>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`صور: ${title}`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-white p-0 text-ink backdrop:bg-black/50"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-sand-deep bg-white px-4 py-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sand"
            aria-label="إغلاق المعرض"
          >
            <CloseIcon className="size-5" />
          </button>
          <p className="num text-sm text-ink-soft">{n} صور</p>
        </div>
        <ul className="mx-auto grid max-w-3xl gap-2 p-4">
          {urls.map((u, i) => (
            <li key={u} id={`photo-${i}`} className="scroll-mt-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`${title} — صورة ${i + 1} من ${n}`} className="w-full rounded-[14px]" loading="lazy" />
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
