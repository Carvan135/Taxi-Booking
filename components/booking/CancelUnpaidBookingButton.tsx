"use client";

import { useState } from "react";
import { CancelBookingConfirmModal } from "@/components/booking/CancelBookingConfirmModal";
import { Button } from "@/components/ui/Button";

type CancelUnpaidBookingButtonProps = {
  bookingId: string;
  bookingReference?: string;
  customerEmail?: string;
  onCancelled?: () => void;
  className?: string;
};

export function CancelUnpaidBookingButton({
  bookingId,
  bookingReference,
  customerEmail,
  onCancelled,
  className,
}: CancelUnpaidBookingButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel-unpaid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          customerEmail ? { customer_email: customerEmail } : {},
        ),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Could not cancel booking");
      }
      setConfirmOpen(false);
      onCancelled?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="secondary"
        size="md"
        loading={loading}
        className="border-slate-300 font-semibold text-content"
        onClick={() => setConfirmOpen(true)}
      >
        Cancel unpaid booking
      </Button>
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <CancelBookingConfirmModal
        open={confirmOpen}
        onClose={() => {
          if (!loading) setConfirmOpen(false);
        }}
        onConfirm={() => void handleCancel()}
        loading={loading}
        bookingReference={bookingReference}
        unpaid
      />
    </div>
  );
}
