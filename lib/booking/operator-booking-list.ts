import {
  BOOKING_STATUS,
  COMPLETION_STATUS,
  type CompletionStatus,
  type PaymentStatus,
} from "@/lib/validations/enums";
import type { Booking } from "@/types";

export function formatPickupLine(booking: Booking): string {
  const t =
    booking.pickup_time.length >= 5
      ? booking.pickup_time.slice(0, 5)
      : booking.pickup_time;
  return `${booking.pickup_date} at ${t}`;
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return `£${Number(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCountdown(iso: string | null): string {
  if (!iso) return "Customer confirmation due soon";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Customer confirmation due now";
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `Customer confirm by: ${hours}h ${mins}m`;
  return `Customer confirm by: ${mins}m`;
}

export function completionLabel(status: CompletionStatus): string | null {
  switch (status) {
    case COMPLETION_STATUS.operator_marked_complete:
      return "Awaiting customer confirmation";
    case COMPLETION_STATUS.customer_confirmed:
      return "Customer confirmed";
    case COMPLETION_STATUS.auto_completed:
      return "Auto-completed";
    case COMPLETION_STATUS.disputed:
      return "Dispute under review";
    default:
      return null;
  }
}

export function canStartJourney(booking: Booking): boolean {
  return (
    booking.status === BOOKING_STATUS.confirmed &&
    booking.payment_status === "paid" &&
    booking.completion_status === COMPLETION_STATUS.none &&
    !booking.journey_started_at
  );
}

export function isEnRoute(booking: Booking): boolean {
  return (
    booking.status === BOOKING_STATUS.confirmed &&
    booking.completion_status === COMPLETION_STATUS.none &&
    Boolean(booking.journey_started_at)
  );
}

export function canMarkComplete(booking: Booking): boolean {
  return isEnRoute(booking) && booking.payment_status === "paid";
}

export function journeyStatusLabel(booking: Booking): string | null {
  if (isEnRoute(booking)) return "En route";
  if (canStartJourney(booking)) return "Ready to start";
  return null;
}

export function isAwaitingCustomerConfirmation(booking: Booking): boolean {
  return (
    booking.completion_status === COMPLETION_STATUS.operator_marked_complete &&
    booking.status === BOOKING_STATUS.confirmed
  );
}

export function isAwaitingPayment(booking: Booking): boolean {
  return (
    booking.payment_status !== "paid" &&
    booking.status !== BOOKING_STATUS.completed &&
    booking.status !== BOOKING_STATUS.cancelled
  );
}

export function isPastBooking(booking: Booking): boolean {
  return (
    booking.status === BOOKING_STATUS.completed ||
    booking.status === BOOKING_STATUS.cancelled
  );
}

export function isUpcomingOperatorBooking(booking: Booking): boolean {
  return !isPastBooking(booking);
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "failed":
      return "Payment failed";
    case "refunded":
      return "Refunded";
    default:
      return "Awaiting payment";
  }
}

export function legLabel(leg: Booking["leg"]): string | null {
  if (leg === "outbound") return "Outbound";
  if (leg === "return") return "Return";
  return null;
}

export type OperatorBookingsTab = "upcoming" | "completed";

export function filterOperatorBookings(
  bookings: Booking[],
  tab: OperatorBookingsTab,
): Booking[] {
  if (tab === "completed") {
    return bookings.filter(isPastBooking);
  }
  return bookings.filter(isUpcomingOperatorBooking);
}

export function sortBookingsForOperator(a: Booking, b: Booking): number {
  const dateCmp = b.pickup_date.localeCompare(a.pickup_date);
  if (dateCmp !== 0) return dateCmp;
  const timeCmp = b.pickup_time.localeCompare(a.pickup_time);
  if (timeCmp !== 0) return timeCmp;
  return (
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
