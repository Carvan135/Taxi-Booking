import {
  BOOKING_STATUS,
  PAYMENT_STATUSES,
  type PaymentStatus,
} from "@/lib/validations/enums";
import type { Booking } from "@/types";

const PAYMENT_UNPAID = PAYMENT_STATUSES[0] satisfies PaymentStatus;
const PAYMENT_FAILED = PAYMENT_STATUSES[3] satisfies PaymentStatus;

export function bookingNeedsPayment(
  booking: Pick<Booking, "status" | "payment_status">,
): boolean {
  return (
    booking.status === BOOKING_STATUS.pending &&
    (booking.payment_status === PAYMENT_UNPAID ||
      booking.payment_status === PAYMENT_FAILED)
  );
}

export function canResumeBookingPayment(
  booking: Pick<Booking, "status" | "payment_status" | "operator_id">,
): boolean {
  return bookingNeedsPayment(booking) && booking.operator_id != null;
}

export function canCancelUnpaidBooking(
  booking: Pick<Booking, "status" | "payment_status" | "journey_started_at">,
): boolean {
  if (booking.journey_started_at) return false;
  return bookingNeedsPayment(booking);
}
