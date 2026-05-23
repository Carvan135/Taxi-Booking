"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  formatTimeUntilUkPickup,
  isPickupStillInFuture,
  normalizeBookingPickupFields,
} from "@/lib/booking/uk-pickup-time";
import type { Booking } from "@/types";

type StartJourneyConfirmModalProps = {
  booking: Booking | null;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function StartJourneyConfirmModal({
  booking,
  open,
  loading,
  onClose,
  onConfirm,
}: StartJourneyConfirmModalProps) {
  if (!booking) return null;

  const pickup = normalizeBookingPickupFields(booking);
  const until = formatTimeUntilUkPickup(pickup.pickup_date, pickup.pickup_time);
  const timeLabel =
    pickup.pickup_time.length >= 5
      ? pickup.pickup_time.slice(0, 5)
      : pickup.pickup_time;
  const pickupLine = `${pickup.pickup_date} at ${timeLabel}`;

  return (
    <Modal
      open={open}
      title="Start journey early?"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={loading}
            onClick={onConfirm}
          >
            Start anyway
          </Button>
        </div>
      }
    >
      <p className="text-sm text-content/80">
        Pickup for booking <strong>#{booking.reference}</strong> is{" "}
        <strong>{pickupLine}</strong>
        {until ? (
          <>
            {" "}
            about <strong>{until}</strong> from now.
          </>
        ) : null}
      </p>
      <p className="mt-3 text-sm text-content/80">
        Starting now will notify the customer that you are en route before the
        scheduled pickup time. Continue only if you are heading to pickup.
      </p>
    </Modal>
  );
}

/** Whether the operator should confirm before calling start-journey. */
export function shouldConfirmEarlyStartJourney(booking: {
  pickup_date: string;
  pickup_time: string;
}): boolean {
  const pickup = normalizeBookingPickupFields(booking);
  return isPickupStillInFuture(pickup.pickup_date, pickup.pickup_time);
}
