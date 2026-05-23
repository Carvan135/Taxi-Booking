"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StarRating } from "@/components/booking/StarRating";
import { Button } from "@/components/ui/Button";
import type { BookingReviewSummary } from "@/types";

type BookingReviewPanelProps = {
  bookingId: string;
  operatorName: string | null;
  canReview: boolean;
  existingReview: BookingReviewSummary | null;
};

export function BookingReviewPanel({
  bookingId,
  operatorName,
  canReview,
  existingReview,
}: BookingReviewPanelProps) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
        setSubmitted(json.review);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-4 sm:px-5 sm:py-5">
      <h2 className="text-base font-semibold text-primary">Rate your trip</h2>
      <p className="mt-1 text-sm text-content/70">
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
        Submit review
      </Button>
    </div>
  );
}
