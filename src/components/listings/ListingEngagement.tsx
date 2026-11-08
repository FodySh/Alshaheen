import Link from "next/link";
import { BookingPicker, type SlotView } from "@/components/listings/BookingPicker";
import { InquiryForm } from "@/components/listings/InquiryForm";
import { getViewer } from "@/lib/auth";
import { formatDay, formatTime, riyadhDayKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/** حجز المعاينة والاستفسار في صفحة العقار. returnTo: الصفحة التي يعود إليها الزائر بعد الدخول */

function LoginPrompt({ returnTo, action }: { returnTo: string; action: string }) {
  const next = encodeURIComponent(returnTo);
  return (
    <div className="grid gap-3">
      <p className="text-sm leading-7 text-ink-soft">سجّل الدخول {action}. يستغرق إنشاء الحساب دقيقة.</p>
      <div className="grid grid-cols-2 gap-2">
        <Link href={`/login?next=${next}`} className="btn btn-primary btn-sm">دخول</Link>
        <Link href={`/register?next=${next}`} className="btn btn-secondary btn-sm">حساب جديد</Link>
      </div>
    </div>
  );
}

export async function BookingSection({ listingId, returnTo }: { listingId: string; returnTo: string }) {
  const user = await getViewer();
  if (!user) return <LoginPrompt returnTo={returnTo} action="لترى المواعيد المتاحة وتحجز" />;
  const supabase = await createClient();
  const { data } = await supabase.rpc("available_slots", { p_listing: listingId });
  const slots: SlotView[] = ((data ?? []) as { slot_id: string; starts_at: string }[]).map((s) => ({
    slot_id: s.slot_id,
    day: riyadhDayKey(s.starts_at),
    dayLabel: formatDay(s.starts_at),
    time: formatTime(s.starts_at),
  }));
  return <BookingPicker listingId={listingId} slots={slots} />;
}

export async function InquirySection({ listingId, returnTo }: { listingId: string; returnTo: string }) {
  const user = await getViewer();
  if (!user) return <LoginPrompt returnTo={returnTo} action="لترسل استفسارك ويصلك الرد" />;
  return <InquiryForm listingId={listingId} />;
}
