import { PageHeader } from "@/components/dashboard/PageHeader";
import { SlotForm } from "@/components/dashboard/SlotForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { deleteSlot } from "@/lib/actions/staff";
import { isAdmin, requireStaff } from "@/lib/auth";
import { formatDay, formatTime, riyadhDayKey, riyadhToday } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Slot } from "@/lib/types";

export const metadata = { title: "مواعيدي المتاحة" };

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const admin = isAdmin(user);
  const supabase = await createClient();
  const { data: staff } = admin
    ? await supabase.from("profiles").select("id, full_name").in("role", ["agent", "admin"]).eq("is_active", true).order("full_name")
    : { data: [] };
  const staffList = (staff ?? []) as { id: string; full_name: string }[];
  const agentId = admin && sp.agent && staffList.some((s) => s.id === sp.agent) ? sp.agent : user.id;

  const [{ data: slots }, { data: booked }] = await Promise.all([
    supabase
      .from("availability_slots")
      .select("id, agent_id, starts_at, ends_at")
      .eq("agent_id", agentId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(400),
    supabase
      .from("bookings")
      .select("slot_id, visitor:profiles!bookings_visitor_id_fkey(full_name)")
      .eq("agent_id", agentId)
      .eq("status", "confirmed")
      .gte("starts_at", new Date().toISOString()),
  ]);
  const bookedMap = new Map(
    ((booked ?? []) as unknown as { slot_id: string | null; visitor: { full_name: string } | null }[])
      .filter((b) => b.slot_id)
      .map((b) => [b.slot_id!, b.visitor?.full_name ?? "زائر"]),
  );
  const days = new Map<string, Slot[]>();
  for (const s of (slots ?? []) as Slot[]) {
    const k = riyadhDayKey(s.starts_at);
    days.set(k, [...(days.get(k) ?? []), s]);
  }

  return (
    <div>
      <PageHeader title="مواعيدي المتاحة" lead="الأوقات التي يستطيع الزوار حجز معاينة فيها لعروضك." />
      <section className="panel p-5">
        <SlotForm today={riyadhToday()} staff={admin ? staffList : undefined} defaultAgent={agentId} />
      </section>

      {admin && staffList.length > 1 && (
        <form className="mt-6 flex items-end gap-2" action="/dashboard/availability">
          <div>
            <label htmlFor="agent-view" className="label">اعرض مواعيد</label>
            <select id="agent-view" name="agent" defaultValue={agentId} className="field">
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-secondary" type="submit">اعرض</button>
        </form>
      )}

      <section className="mt-6" aria-labelledby="slots-h">
        <h2 id="slots-h" className="font-semibold">المواعيد القادمة</h2>
        {days.size === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-stone bg-white px-4 py-8 text-center text-sm text-ink-soft">
            لا توجد مواعيد قادمة. أضف مواعيد ليظهر للزوار زر الحجز في صفحات عروضك.
          </p>
        ) : (
          <div className="mt-3 grid gap-4">
            {[...days.entries()].map(([day, list]) => (
              <div key={day} className="panel p-4">
                <p className="font-medium">{formatDay(list[0].starts_at)}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {list.map((s) => {
                    const who = bookedMap.get(s.id);
                    return (
                      <li key={s.id} className={`flex items-center gap-1 rounded-md border px-2 py-1 text-sm ${who ? "border-olive bg-olive-tint" : "border-sand-deep bg-white"}`}>
                        <span className="num">{formatTime(s.starts_at)}</span>
                        {who ? (
                          <span className="text-xs text-olive-deep">— {who}</span>
                        ) : (
                          <form action={deleteSlot}>
                            <input type="hidden" name="id" value={s.id} />
                            <SubmitButton className="rounded px-1 text-xs text-ink-soft hover:bg-sand hover:text-danger" pendingLabel="…">
                              <span aria-label={`احذف موعد ${formatTime(s.starts_at)}`}>×</span>
                            </SubmitButton>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
