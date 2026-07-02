"use client";

import { Modal } from "@/components/ui/Modal";
import { BookingReviewForm } from "@/components/booking/BookingReviewForm";
import type { BookingReviewSummary } from "@/types";

type BookingReviewModalProps = {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  operatorName: string | null;
  bookingReference?: string;
  customerEmail?: string;
  onSubmitted?: (review: BookingReviewSummary) => void;
};

export function BookingReviewModal({
  open,
  onClose,
  bookingId,
  operatorName,
  bookingReference,
  customerEmail,
  onSubmitted,
}: BookingReviewModalProps) {
  return (
    <Modal
      open={open}
      title="Rate your trip"
      onClose={onClose}
    >
      {bookingReference ? (
        <p className="text-xs text-content/55">Booking #{bookingReference}</p>
      ) : null}
      <BookingReviewForm
        bookingId={bookingId}
        operatorName={operatorName}
        customerEmail={customerEmail}
        onSubmitted={(review) => {
          onSubmitted?.(review);
          onClose();
        }}
      />
    </Modal>
  );
}
