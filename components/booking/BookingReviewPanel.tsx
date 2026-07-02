"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StarRating } from "@/components/booking/StarRating";
import { BookingReviewForm } from "@/components/booking/BookingReviewForm";
import type { BookingReviewSummary } from "@/types";

type BookingReviewPanelProps = {
  bookingId: string;
  operatorName: string | null;
  canReview: boolean;
  existingReview: BookingReviewSummary | null;
  customerEmail?: string;
  onReviewSubmitted?: () => void;
};

export function BookingReviewPanel({
  bookingId,
  operatorName,
  canReview,
  existingReview,
  customerEmail,
  onReviewSubmitted,
}: BookingReviewPanelProps) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState<BookingReviewSummary | null>(
    existingReview,
  );

  if (!canReview && !submitted) {
    return null;
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-4">
        <h2 className="text-base font-semibold text-primary">Your review</h2>
        <div className="mt-2">
          <StarRating value={submitted.rating} size="sm" label="Your rating" />
        </div>
        {submitted.comment ? (
          <p className="mt-3 text-sm text-content/80">{submitted.comment}</p>
        ) : null}
        <p className="mt-2 text-xs text-content/55">Thanks for your feedback.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-4 sm:px-5 sm:py-5">
      <h2 className="text-base font-semibold text-primary">Rate your trip</h2>
      <BookingReviewForm
        bookingId={bookingId}
        operatorName={operatorName}
        customerEmail={customerEmail}
        onSubmitted={(review) => {
          setSubmitted(review);
          onReviewSubmitted?.();
          router.refresh();
        }}
      />
    </div>
  );
}
