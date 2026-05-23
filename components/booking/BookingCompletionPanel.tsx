"use client";

import { BookingCompletionActions } from "@/components/booking/BookingCompletionActions";
import {
  isBookingCompletedForCustomer,
  isBookingDisputed,
  needsCustomerCompletionAction,
} from "@/lib/booking/customer-completion-ui";
import type { Booking } from "@/types";
import {
  BOOKING_STATUS,
  COMPLETION_STATUS,
  type CompletionStatus,
} from "@/lib/validations/enums";

type BookingCompletionPanelProps = {
  booking: Booking;
  onAfterConfirm?: () => void;
  onRefresh?: () => void;
};

export function BookingCompletionPanel({
  booking,
  onAfterConfirm,
  onRefresh,
}: BookingCompletionPanelProps) {
  const completionStatus = (booking.completion_status ??
    COMPLETION_STATUS.none) as CompletionStatus;

  const showPanel =
    booking.status === BOOKING_STATUS.confirmed ||
    booking.status === BOOKING_STATUS.completed ||
    completionStatus === COMPLETION_STATUS.operator_marked_complete ||
    completionStatus === COMPLETION_STATUS.customer_confirmed ||
    completionStatus === COMPLETION_STATUS.auto_completed ||
    completionStatus === COMPLETION_STATUS.disputed;

  if (!showPanel) return null;

  if (isBookingCompletedForCustomer(booking)) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
        <strong className="font-semibold">Completed.</strong> This booking has
        been completed.
      </div>
    );
  }

  if (isBookingDisputed(booking)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
        <strong className="font-semibold">Dispute under review.</strong> A
        dispute has been raised for this booking. Our team is reviewing it.
      </div>
    );
  }

  if (
    booking.status === BOOKING_STATUS.confirmed &&
    completionStatus === COMPLETION_STATUS.none &&
    booking.journey_started_at
  ) {
    return (
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-950">
        <strong className="font-semibold">Enjoy your journey!</strong> Your driver
        is on the way. They will mark the trip complete when delivered.
      </div>
    );
  }

  if (
    booking.status === BOOKING_STATUS.confirmed &&
    completionStatus === COMPLETION_STATUS.none
  ) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
        <strong className="font-semibold">Confirmed.</strong> Your operator is
        assigned and will start the journey when they head to pickup.
      </div>
    );
  }

  if (needsCustomerCompletionAction(booking)) {
    return (
      <BookingCompletionActions
        booking={booking}
        onAfterConfirm={onAfterConfirm}
        onRefresh={onRefresh}
      />
    );
  }

  return null;
}
