import { FILE_KIND_LABEL } from "@/lib/constants";
import type { RequestFile } from "@/lib/types";
import { DocIcon } from "./icons";

export type SignedFile = RequestFile & { url: string | null };

export function FileGrid({ files }: { files: SignedFile[] }) {
  if (files.length === 0) return <p className="text-sm text-ink-soft">لا توجد مرفقات.</p>;
  const photos = files.filter((f) => f.kind === "photo");
  const docs = files.filter((f) => f.kind !== "photo");
  return (
    <div className="grid gap-4">
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((f) => (
            <li key={f.id}>
              {f.url ? (
                <a href={f.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.file_name ?? "صورة"} className="aspect-square w-full rounded-md object-cover" loading="lazy" />
                </a>
              ) : (
                <div className="aspect-square rounded-md bg-sand" />
              )}
            </li>
          ))}
        </ul>
      )}
      {docs.length > 0 && (
        <ul className="grid gap-2">
          {docs.map((f) => (
            <li key={f.id}>
              <a href={f.url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border border-sand-deep bg-white px-3 py-2 text-sm hover:border-stone">
                <DocIcon className="size-5 text-olive" />
                <span className="font-medium">{FILE_KIND_LABEL[f.kind]}</span>
                <span className="truncate text-ink-soft">{f.file_name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
