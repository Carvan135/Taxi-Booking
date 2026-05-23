import {
  BOOKING_STATUS,
  COMPLETION_STATUS,
  type CompletionStatus,
} from "@/lib/validations/enums";
import type { Booking } from "@/types";

export function getCompletionStatus(
  booking: Pick<Booking, "completion_status">,
): CompletionStatus {
  return (booking.completion_status ?? COMPLETION_STATUS.none) as CompletionStatus;
}

/** Operator marked delivered; customer must confirm or dispute. */
export function needsCustomerCompletionAction(
  booking: Pick<Booking, "status" | "completion_status">,
): boolean {
  return (
    booking.status === BOOKING_STATUS.confirmed &&
    getCompletionStatus(booking) === COMPLETION_STATUS.operator_marked_complete
  );
}

export function isBookingCompletedForCustomer(
  booking: Pick<Booking, "status" | "completion_status">,
): boolean {
  const completion = getCompletionStatus(booking);
  return (
    booking.status === BOOKING_STATUS.completed ||
    completion === COMPLETION_STATUS.customer_confirmed ||
    completion === COMPLETION_STATUS.auto_completed
  );
}

export function isBookingDisputed(
  booking: Pick<Booking, "completion_status">,
): boolean {
  return getCompletionStatus(booking) === COMPLETION_STATUS.disputed;
}
