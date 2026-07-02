import { BOOKING_STATUS, COMPLETION_STATUS } from "@/lib/validations/enums";
import type { Booking } from "@/types";
import { needsCustomerCompletionAction } from "@/lib/booking/customer-completion-ui";

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

export type CustomerTripStatus = {
  variant: "awaiting_pickup" | "en_route";
  title: string;
  message: string;
  badge: string;
};

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

/** Customer-facing operator journey status for confirmed, active trips. */
export function getCustomerTripStatus(
  booking: Pick<
    Booking,
    | "status"
    | "journey_started_at"
    | "completion_status"
    | "payment_status"
    | "operator_id"
  >,
): CustomerTripStatus | null {
  if (needsCustomerCompletionAction(booking)) return null;

  if (showCustomerJourneyGreeting(booking)) {
    return {
      variant: "en_route",
      title: "Driver en route",
      message: "Your operator is on the way to pick you up.",
      badge: "En route",
    };
  }

  if (
    booking.status !== BOOKING_STATUS.confirmed ||
    booking.payment_status !== "paid" ||
    booking.completion_status !== COMPLETION_STATUS.none ||
    booking.journey_started_at
  ) {
    return null;
  }

  if (booking.operator_id) {
    return {
      variant: "awaiting_pickup",
      title: "Operator assigned",
      message:
        "Your driver will notify you when they start heading to your pickup.",
      badge: "Awaiting pickup",
    };
  }

  return {
    variant: "awaiting_pickup",
    title: "Booking confirmed",
    message: "An operator will be assigned before your pickup time.",
    badge: "Confirmed",
  };
}
