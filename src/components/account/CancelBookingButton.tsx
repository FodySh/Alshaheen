"use client";
import { cancelMyBooking } from "@/lib/actions/visitor";
import { SubmitButton } from "../forms/SubmitButton";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  return (
    <form
      action={cancelMyBooking}
      onSubmit={(e) => {
        if (!confirm("إلغاء موعد المعاينة؟")) e.preventDefault();
      }}
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <SubmitButton className="btn btn-danger btn-sm" pendingLabel="جارٍ الإلغاء…">إلغاء الموعد</SubmitButton>
    </form>
  );
}
