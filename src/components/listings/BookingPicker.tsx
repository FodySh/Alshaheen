"use client";
import { ActionForm } from "../forms/ActionForm";
import { useActionState, useMemo, useState } from "react";
import { bookViewing } from "@/lib/actions/visitor";
import { FormMessage } from "../forms/FormMessage";
import { SubmitButton } from "../forms/SubmitButton";

export type SlotView = { slot_id: string; day: string; dayLabel: string; time: string };

export function BookingPicker({ listingId, slots }: { listingId: string; slots: SlotView[] }) {
  const [state, action] = useActionState(bookViewing, null);
  const days = useMemo(() => {
    const m = new Map<string, { label: string; slots: SlotView[] }>();
    for (const s of slots) {
      if (!m.has(s.day)) m.set(s.day, { label: s.dayLabel, slots: [] });
      m.get(s.day)!.slots.push(s);
    }
    return [...m.entries()];
  }, [slots]);
  const [day, setDay] = useState(days[0]?.[0] ?? "");

  if (state?.ok) return <FormMessage state={state} />;
  if (slots.length === 0)
    return <p className="text-sm leading-7 text-ink-soft">لا توجد مواعيد متاحة خلال الأيام القادمة. أرسل استفساراً أو تواصل مع المكتب لترتيب موعد.</p>;

  const current = days.find(([d]) => d === day)?.[1];
  return (
    <ActionForm action={action} className="grid gap-4">
      <input type="hidden" name="listing_id" value={listingId} />
      <div role="tablist" aria-label="اليوم" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map(([d, v]) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === day}
            onClick={() => setDay(d)}
            className={`shrink-0 rounded-md border px-3 py-2 text-sm font-medium ${d === day ? "border-olive bg-olive-tint text-olive-deep" : "border-sand-deep bg-white hover:border-stone"}`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <fieldset>
        <legend className="label">الوقت</legend>
        <div className="grid grid-cols-3 gap-2">
          {current?.slots.map((s) => (
            <label key={s.slot_id} className="cursor-pointer">
              <input type="radio" name="slot_id" value={s.slot_id} className="peer sr-only" required />
              <span className="num block rounded-md border border-sand-deep bg-white px-2 py-2 text-center text-sm peer-checked:border-olive peer-checked:bg-olive peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-olive hover:border-stone">
                {s.time}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="bk-note" className="label">ملاحظة للوسيط <span className="font-normal text-ink-soft">(اختياري)</span></label>
        <input id="bk-note" name="note" maxLength={500} className="field" placeholder="مثال: سأحضر مع العائلة" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ الحجز…">احجز الموعد</SubmitButton>
    </ActionForm>
  );
}
