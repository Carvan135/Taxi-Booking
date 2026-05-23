"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type CancelBookingConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  bookingReference?: string;
  /** Unpaid pending booking — softer copy, no refund wording. */
  unpaid?: boolean;
};

export function CancelBookingConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  bookingReference,
  unpaid = false,
}: CancelBookingConfirmModalProps) {
  const refLabel = bookingReference ? ` #${bookingReference}` : "";

  return (
    <Modal
      open={open}
      title={unpaid ? "Cancel unpaid booking?" : "Cancel booking?"}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="sm:min-w-[7rem]"
          >
            Keep booking
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={loading}
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 sm:min-w-[7rem]"
          >
            Yes, cancel
          </Button>
        </div>
      }
    >
      {unpaid ? (
        <p className="text-sm text-content/80">
          This will cancel booking
          <strong>{refLabel}</strong>. You have not been charged. You can book
          again anytime.
        </p>
      ) : (
        <p className="text-sm text-content/80">
          Are you sure you want to cancel booking
          <strong>{refLabel}</strong>? This cannot be undone.
        </p>
      )}
    </Modal>
  );
}
