"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookingCompletionPanel } from "@/components/booking/BookingCompletionPanel";
import { BookingReviewModal } from "@/components/booking/BookingReviewModal";
import { BookingReviewPanel } from "@/components/booking/BookingReviewPanel";
import type { Booking } from "@/types";
import type { BookingReviewSummary } from "@/types";

type CustomerBookingDetailPanelsProps = {
  booking: Booking;
  operatorName: string | null;
  canReview: boolean;
  existingReview: BookingReviewSummary | null;
};

export function CustomerBookingDetailPanels({
  booking,
  operatorName,
  canReview,
  existingReview,
}: CustomerBookingDetailPanelsProps) {
  const router = useRouter();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [localReview, setLocalReview] = useState(existingReview);

  return (
    <>
      <BookingCompletionPanel
        booking={booking}
        onAfterConfirm={() => setReviewModalOpen(true)}
        onRefresh={() => router.refresh()}
      />
      <BookingReviewPanel
        bookingId={booking.id}
        operatorName={operatorName}
        canReview={canReview && !localReview}
        existingReview={localReview}
        onReviewSubmitted={() => router.refresh()}
      />
      <BookingReviewModal
        open={reviewModalOpen && !localReview}
        onClose={() => setReviewModalOpen(false)}
        bookingId={booking.id}
        operatorName={operatorName}
        bookingReference={booking.reference}
        onSubmitted={(review) => {
          setLocalReview(review);
          router.refresh();
        }}
      />
    </>
  );
}
