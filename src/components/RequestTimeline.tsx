import { REQUEST_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { RequestEvent } from "@/lib/types";

export function RequestTimeline({ events, names }: { events: RequestEvent[]; names?: Record<string, string> }) {
  return (
    <ol className="grid">
      {events.map((e, i) => (
        <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < events.length - 1 && <span aria-hidden className="absolute start-[0.3rem] top-4 h-[calc(100%-0.5rem)] w-px bg-sand-deep" />}
          <span aria-hidden className={`mt-2 size-2.5 shrink-0 rounded-full ${e.is_internal ? "bg-stone" : "bg-olive"}`} />
          <div className="min-w-0">
            <p className="text-sm">
              {e.to_status && e.to_status !== e.from_status ? (
                <span className="font-semibold">{REQUEST_STATUS_LABEL[e.to_status]}</span>
              ) : (
                <span className="font-semibold">{e.is_internal ? "ملاحظة داخلية" : "تحديث"}</span>
              )}
              <span className="ms-2 text-xs text-ink-soft">{formatDateTime(e.created_at)}</span>
              {names && e.actor_id && names[e.actor_id] && <span className="ms-2 text-xs text-ink-soft">— {names[e.actor_id]}</span>}
            </p>
            {e.note && <p className="mt-0.5 whitespace-pre-line text-sm leading-7 text-ink-soft">{e.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
