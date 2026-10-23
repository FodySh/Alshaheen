import type { Tone } from "@/lib/constants";

const TONES: Record<Tone, string> = {
  neutral: "bg-sand text-ink",
  olive: "bg-olive-tint text-olive-deep",
  clay: "bg-clay-tint text-clay",
  danger: "bg-danger-tint text-danger",
  muted: "bg-transparent text-ink-soft ring-1 ring-inset ring-sand-deep",
};

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold leading-5 whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}
