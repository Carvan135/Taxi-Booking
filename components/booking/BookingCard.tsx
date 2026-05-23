"use client";

import { ArrowRight, Car, Check, Clock, Copy, MapPin } from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookingCompletionActions } from "@/components/booking/BookingCompletionActions";
import { BookingReviewModal } from "@/components/booking/BookingReviewModal";
import { BookingStatusBadge } from "@/components/booking/BookingStatusBadge";
import { OperatorContactModal } from "@/components/booking/OperatorContactModal";
import { CancelBookingConfirmModal } from "@/components/booking/CancelBookingConfirmModal";
import { CancelUnpaidBookingButton } from "@/components/booking/CancelUnpaidBookingButton";
import {
  canCancelUnpaidBooking,
  canCustomerCancelBooking,
  canResumeBookingPayment,
  isBookingDisputed,
  needsCustomerCompletionAction,
  showCustomerJourneyGreeting,
} from "@/lib/booking/customer-booking-ui";
import { canCustomerReviewBooking } from "@/lib/booking/customer-review";
import { bookingKeys } from "@/hooks/queries/keys";
import { operatorContactFromRow } from "@/lib/booking/operator-contact";
import { PLACEHOLDER } from "@/lib/format/display";
import { BOOKING_LEG } from "@/lib/validations/enums";
import { Button } from "@/components/ui/Button";
import type { CustomerBookingRow } from "@/types";

type PairedLeg = {
  reference: string;
};

type BookingCardProps = {
  booking: CustomerBookingRow;
  pairedLeg?: PairedLeg | null;
  compact?: boolean;
  /** Show cancel + contact actions (upcoming tab, cancellable booking). */
  showActions?: boolean;
  onCancel?: (bookingId: string) => void;
  cancellingId?: string | null;
  /** Guest lookup email — required to cancel unpaid bookings without an account. */
  lookupEmail?: string;
  onUnpaidCancelled?: () => void;
};

function formatPickupLine(booking: CustomerBookingRow): string {
  const t =
    booking.pickup_time.length >= 5
      ? booking.pickup_time.slice(0, 5)
      : booking.pickup_time;
  return `${booking.pickup_date} at ${t}`;
}

function formatPrice(amount: number | null): string {
  if (amount == null || Number.isNaN(Number(amount))) return PLACEHOLDER;
  return `£${Number(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function operatorLabel(booking: CustomerBookingRow): string {
  const op = booking.operators;
  if (op?.business_name && op?.vehicle_type) {
    return `${op.business_name} · ${op.vehicle_type}`;
  }
  if (booking.operator_id) {
    return "Operator assigned (details unavailable)";
  }
  return "Operator not assigned yet";
}

export function BookingCard({
  booking,
  pairedLeg,
  compact = false,
  showActions = false,
  onCancel,
  cancellingId = null,
  lookupEmail,
  onUnpaidCancelled,
}: BookingCardProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [localReview, setLocalReview] = useState(booking.review);

  function refreshBookings() {
    void queryClient.invalidateQueries({ queryKey: bookingKeys.customer });
  }

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(booking.reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  const isReturnLeg = booking.leg === BOOKING_LEG.return;
  const contact = operatorContactFromRow(booking.operators);
  const operator = booking.operators;
  const canCancel =
    showActions &&
    onCancel != null &&
    booking.customer_id != null &&
    canCustomerCancelBooking(booking);
  const showJourneyGreeting = showCustomerJourneyGreeting(booking);
  const needsCompletion = needsCustomerCompletionAction(booking);
  const canReview =
    !needsCompletion &&
    canCustomerReviewBooking({ ...booking, review: localReview });
  const needsPayment = canResumeBookingPayment(booking);
  const canCancelUnpaid = needsPayment && canCancelUnpaidBooking(booking);
  const payHref = booking.customer_id
    ? `/bookings/${booking.id}/pay`
    : `/complete-payment?id=${encodeURIComponent(booking.id)}`;

  return (
    <article
      className={`rounded-2xl border border-slate-200/90 bg-white shadow-sm ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void copyReference()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-content hover:text-secondary"
            title="Copy reference"
          >
            #{booking.reference}
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" aria-hidden />
            ) : (
              <Copy className="h-4 w-4 text-content/45" aria-hidden />
            )}
          </button>
          {showActions ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Upcoming
            </span>
          ) : (
            <BookingStatusBadge status={booking.status} />
          )}
          {isReturnLeg ? (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800 ring-1 ring-inset ring-violet-200">
              Return Journey
            </span>
          ) : null}
        </div>
        <p className="text-lg font-bold tabular-nums text-secondary sm:text-xl">
          {formatPrice(booking.price)}
        </p>
      </div>

      <p className="mt-2 text-sm text-slate-500">{formatPickupLine(booking)}</p>

      {showJourneyGreeting ? (
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-semibold">Enjoy your journey!</p>
          <p className="mt-1 text-sky-900/90">
            Your driver is on the way to pickup.
          </p>
        </div>
      ) : null}

      {compact ? (
        <>
          <div className="mt-4 flex items-center gap-2 text-sm text-content">
            <span className="min-w-0 flex-1 font-medium">
              {booking.pickup_address}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-content/40" aria-hidden />
            <span className="min-w-0 flex-1 text-right font-medium">
              {booking.dropoff_address}
            </span>
          </div>
          <p className="mt-2 text-sm text-content/80">{operatorLabel(booking)}</p>
        </>
      ) : (
        <ul className="mt-5 space-y-4">
          <li className="flex gap-3">
            <MapPin
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
              aria-hidden
            />
            <div>
              <p className="text-xs font-medium text-slate-500">Pickup</p>
              <p className="text-sm font-medium text-content">
                {booking.pickup_address}
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <MapPin
              className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
              aria-hidden
            />
            <div>
              <p className="text-xs font-medium text-slate-500">Destination</p>
              <p className="text-sm font-medium text-content">
                {booking.dropoff_address}
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <Car className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
            <div>
              <p className="text-xs font-medium text-slate-500">Operator</p>
              <p className="text-sm font-medium text-content">
                {operatorLabel(booking)}
              </p>
            </div>
          </li>
        </ul>
      )}

      {pairedLeg ? (
        <p className="mt-2 text-xs text-content/55">
          {isReturnLeg ? "Outbound" : "Return"} leg:{" "}
          <span className="font-semibold text-content">
            #{pairedLeg.reference}
          </span>
        </p>
      ) : null}

      {needsCompletion ? (
        <BookingCompletionActions
          booking={booking}
          compact
          onAfterConfirm={() => setReviewModalOpen(true)}
          onRefresh={refreshBookings}
        />
      ) : null}

      {!needsCompletion && isBookingDisputed(booking) ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong className="font-semibold">Dispute under review.</strong> Our
          team is reviewing your case.
        </div>
      ) : null}

      {needsPayment ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-950">Payment required</p>
          <p className="mt-1 text-xs text-amber-900/90">
            This booking is not confirmed until payment is completed.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link
              href={payHref}
              className="text-sm font-semibold text-secondary hover:underline"
            >
              Complete payment →
            </Link>
            {canCancelUnpaid ? (
              <CancelUnpaidBookingButton
                bookingId={booking.id}
                bookingReference={booking.reference}
                customerEmail={lookupEmail ?? booking.customer_email}
                onCancelled={onUnpaidCancelled}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {localReview ? (
        <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-content/80">
          <p className="font-semibold text-primary">Thanks for your review!</p>
          <p className="mt-1 text-xs">You rated this trip {localReview.rating}/5.</p>
        </div>
      ) : canReview ? (
        <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3">
          <p className="text-sm font-semibold text-primary">How was your trip?</p>
          <p className="mt-1 text-xs text-content/70">
            Share a quick rating for {operatorLabel(booking)}.
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="mt-3"
            onClick={() => setReviewModalOpen(true)}
          >
            Rate your trip
          </Button>
        </div>
      ) : null}

      {showActions && !needsCompletion ? (
        <div className="mt-4">
          <Link
            href={`/bookings/${booking.id}`}
            className="text-sm font-semibold text-secondary hover:underline"
          >
            View booking details
          </Link>
        </div>
      ) : null}

      {showActions && (canCancel || contact) ? (
        <>
          <div className="my-5 border-t border-slate-100" />
          <div className="flex flex-col gap-3 sm:flex-row">
            {canCancel ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="flex-1 border-slate-300 font-semibold text-content"
                loading={cancellingId === booking.id}
                disabled={cancellingId !== null && cancellingId !== booking.id}
                onClick={() => setCancelConfirmOpen(true)}
              >
                Cancel booking
              </Button>
            ) : null}
            {contact ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="flex-1 border-primary font-semibold text-primary"
                onClick={() => setContactOpen(true)}
              >
                Contact operator
              </Button>
            ) : (
              <span
                className="inline-flex min-h-11 flex-1 cursor-not-allowed items-center justify-center rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400"
                title="Operator contact not available"
              >
                Contact operator
              </span>
            )}
          </div>
        </>
      ) : null}

      {contact && operator ? (
        <OperatorContactModal
          open={contactOpen}
          onClose={() => setContactOpen(false)}
          operator={operator}
          bookingReference={booking.reference}
        />
      ) : null}

      <CancelBookingConfirmModal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        loading={cancellingId === booking.id}
        bookingReference={booking.reference}
        onConfirm={() => {
          void Promise.resolve(onCancel?.(booking.id)).finally(() => {
            setCancelConfirmOpen(false);
          });
        }}
      />

      <BookingReviewModal
        open={reviewModalOpen && !localReview}
        onClose={() => setReviewModalOpen(false)}
        bookingId={booking.id}
        operatorName={booking.operators?.business_name ?? null}
        bookingReference={booking.reference}
        onSubmitted={(review) => {
          setLocalReview(review);
          refreshBookings();
        }}
      />
    </article>
  );
}
