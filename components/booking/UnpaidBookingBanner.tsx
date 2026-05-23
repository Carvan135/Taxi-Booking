"use client";

import Link from "next/link";
import { CancelUnpaidBookingButton } from "@/components/booking/CancelUnpaidBookingButton";
import { canCancelUnpaidBooking, canResumeBookingPayment } from "@/lib/booking/booking-payment";
import type { Booking } from "@/types";

type UnpaidBookingBannerProps = {
  booking: Pick<
    Booking,
    | "id"
    | "reference"
    | "status"
    | "payment_status"
    | "operator_id"
    | "customer_email"
    | "journey_started_at"
  >;
};

export function UnpaidBookingBanner({ booking }: UnpaidBookingBannerProps) {
  if (!canResumeBookingPayment(booking)) {
    return null;
  }

  const payHref = `/bookings/${booking.id}/pay`;

  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
      <p className="font-semibold text-amber-950">Payment required</p>
      <p className="mt-1 text-sm text-amber-900/90">
        Complete payment to confirm this booking with your operator.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          href={payHref}
          className="inline-flex rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
        >
          Complete payment
        </Link>
        {canCancelUnpaidBooking(booking) ? (
          <CancelUnpaidBookingButton
            bookingId={booking.id}
            bookingReference={booking.reference}
          />
        ) : null}
      </div>
    </div>
  );
}
