import { BOOKING_STATUS, COMPLETION_STATUS } from "@/lib/validations/enums";
import type { Booking } from "@/types";

export {
  bookingNeedsPayment,
  canCancelUnpaidBooking,
  canResumeBookingPayment,
} from "@/lib/booking/booking-payment";

export {
  isBookingCompletedForCustomer,
  isBookingDisputed,
  needsCustomerCompletionAction,
} from "@/lib/booking/customer-completion-ui";

/** True when the customer may cancel from the app (also enforced in DB RPC). */
export function canCustomerCancelBooking(
  booking: Pick<Booking, "status" | "journey_started_at">,
): boolean {
  if (booking.journey_started_at) return false;
  return (
    booking.status !== BOOKING_STATUS.completed &&
    booking.status !== BOOKING_STATUS.cancelled
  );
}

/** Show "Enjoy your journey" when the driver has started the trip. */
export function showCustomerJourneyGreeting(
  booking: Pick<Booking, "status" | "journey_started_at" | "completion_status">,
): boolean {
  return (
    Boolean(booking.journey_started_at) &&
    booking.status === BOOKING_STATUS.confirmed &&
    booking.completion_status === COMPLETION_STATUS.none
  );
}
