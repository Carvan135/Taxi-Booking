"use client";

import { useState } from "react";
import { StarRating } from "@/components/booking/StarRating";
import { Button } from "@/components/ui/Button";
import type { BookingReviewSummary } from "@/types";

type BookingReviewFormProps = {
  bookingId: string;
  operatorName: string | null;
  /** Guest lookup email — required to submit without an account. */
  customerEmail?: string;
  onSubmitted?: (review: BookingReviewSummary) => void;
  submitLabel?: string;
};

export function BookingReviewForm({
  bookingId,
  operatorName,
  customerEmail,
  onSubmitted,
  submitLabel = "Submit review",
}: BookingReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitReview() {
    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          ...(customerEmail ? { customer_email: customerEmail } : {}),
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        review?: BookingReviewSummary;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not submit review");
      }
      if (json.review) {
        onSubmitted?.(json.review);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="text-sm text-content/70">
        {operatorName
          ? `How was your experience with ${operatorName}?`
          : "How was your experience with your operator?"}
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-content/60">
          Rating
        </p>
        <div className="mt-2">
          <StarRating value={rating} onChange={setRating} disabled={loading} />
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor={`review-comment-${bookingId}`}
          className="text-xs font-semibold uppercase tracking-wide text-content/60"
        >
          Comment <span className="font-normal normal-case">(optional)</span>
        </label>
        <textarea
          id={`review-comment-${bookingId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={2000}
          disabled={loading}
          placeholder="Share what went well or what could improve…"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-content shadow-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25"
        />
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        variant="primary"
        size="sm"
        className="mt-4"
        loading={loading}
        disabled={loading || rating < 1}
        onClick={() => void submitReview()}
      >
        {submitLabel}
      </Button>
    </>
  );
}
