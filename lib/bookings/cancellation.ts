import type { Booking } from "@/types";

export type CancelBookingEvaluation = {
  allowed: boolean;
  reason?: string;
  refundEligible: boolean;
  refundType: "full" | "none";
};

type BookingForCancellation = Pick<
  Booking,
  "status" | "pickup_date" | "pickup_time" | "price"
> & {
  stripe_payment_status?: string | null;
  payment_status?: string;
};

export function canCancelBooking(
  booking: BookingForCancellation,
  cutoffHours: number,
): CancelBookingEvaluation {
  if (["completed", "cancelled"].includes(booking.status)) {
    return {
      allowed: false,
      reason: `Booking already ${booking.status}`,
      refundEligible: false,
      refundType: "none",
    };
  }

  const paymentStatus =
    booking.stripe_payment_status ?? booking.payment_status ?? "unpaid";
  if (paymentStatus !== "paid") {
    return {
      allowed: false,
      reason: "No payment found",
      refundEligible: false,
      refundType: "none",
    };
  }

  const pickupDatetime = new Date(
    `${booking.pickup_date}T${booking.pickup_time}`,
  );
  const hoursUntilPickup =
    (pickupDatetime.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilPickup < cutoffHours) {
    return {
      allowed: false,
      reason: `Cancellations must be made at least ${cutoffHours} hours before pickup`,
      refundEligible: false,
      refundType: "none",
    };
  }

  return { allowed: true, refundEligible: true, refundType: "full" };
}

export function sumBookingPrices(
  bookings: Array<{ price: number | null }>,
): number {
  return bookings.reduce((sum, row) => sum + Number(row.price ?? 0), 0);
}
