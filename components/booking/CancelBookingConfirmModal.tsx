"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type CancelBookingConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  policyLoading?: boolean;
  bookingReference?: string;
  /** Unpaid pending booking — softer copy, no refund wording. */
  unpaid?: boolean;
  policySummary?: string | null;
  policyDetail?: string | null;
  policyBlocked?: boolean;
};

export function CancelBookingConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  bookingReference,
  unpaid = false,
  policyLoading = false,
  policySummary,
  policyDetail,
  policyBlocked = false,
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
            {policyBlocked ? "Close" : "Keep booking"}
          </Button>
          {!policyBlocked ? (
            <Button
              type="button"
              variant="primary"
              loading={loading || policyLoading}
              disabled={policyLoading}
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 sm:min-w-[7rem]"
            >
              Yes, cancel
            </Button>
          ) : null}
        </div>
      }
    >
      {policyLoading ? (
        <p className="text-sm text-content/70">Loading cancellation policy…</p>
      ) : unpaid ? (
        <p className="text-sm text-content/80">
          This will cancel booking
          <strong>{refLabel}</strong>. You have not been charged. You can book
          again anytime.
        </p>
      ) : (
        <div className="space-y-3 text-sm text-content/80">
          <p>
            Are you sure you want to cancel booking
            <strong>{refLabel}</strong>?
          </p>
          {policySummary ? (
            <div
              className={`rounded-xl px-4 py-3 ${
                policyBlocked
                  ? "border border-amber-200 bg-amber-50 text-amber-950"
                  : "border border-sky-200 bg-sky-50 text-sky-950"
              }`}
            >
              <p className="font-semibold">{policySummary}</p>
              {policyDetail ? (
                <p className="mt-1 text-xs leading-relaxed opacity-90">
                  {policyDetail}
                </p>
              ) : null}
            </div>
          ) : (
            <p>This cannot be undone.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
