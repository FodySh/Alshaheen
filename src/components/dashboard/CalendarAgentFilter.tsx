"use client";
import Form from "next/form";

/** تصفية التقويم حسب الوسيط (للمدير): يُرسل عند تغيير الاختيار */
export function CalendarAgentFilter({
  agents,
  current,
  month,
  hide,
}: {
  agents: { id: string; full_name: string }[];
  current: string;
  month: string;
  hide: string;
}) {
  return (
    <Form action="/dashboard/calendar" className="flex items-center gap-2">
      <input type="hidden" name="m" value={month} />
      {hide && <input type="hidden" name="hide" value={hide} />}
      <label htmlFor="cal-agent" className="shrink-0 text-sm text-ink-soft">الوسيط</label>
      <select
        id="cal-agent"
        name="agent"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="field py-1.5 text-sm"
      >
        <option value="">كل الفريق</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>{a.full_name}</option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="btn btn-quiet btn-sm">عرض</button>
      </noscript>
    </Form>
  );
}
