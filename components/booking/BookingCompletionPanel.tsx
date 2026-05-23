"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Booking } from "@/types";
import {
  BOOKING_STATUS,
  COMPLETION_STATUS,
  type CompletionStatus,
} from "@/lib/validations/enums";

function formatCountdown(iso: string | null): string {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Completing soon…";
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} minutes`;
}

type BookingCompletionPanelProps = {
  booking: Booking;
};

export function BookingCompletionPanel({ booking }: BookingCompletionPanelProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(
    formatCountdown(booking.auto_complete_at),
  );
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"confirm" | "dispute" | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const completionStatus = (booking.completion_status ??
    COMPLETION_STATUS.none) as CompletionStatus;

  useEffect(() => {
    if (completionStatus !== COMPLETION_STATUS.operator_marked_complete) return;
    const tick = () => setCountdown(formatCountdown(booking.auto_complete_at));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [booking.auto_complete_at, completionStatus]);

  const showPanel =
    booking.status === BOOKING_STATUS.confirmed ||
    booking.status === BOOKING_STATUS.completed ||
    completionStatus === COMPLETION_STATUS.operator_marked_complete ||
    completionStatus === COMPLETION_STATUS.customer_confirmed ||
    completionStatus === COMPLETION_STATUS.auto_completed ||
    completionStatus === COMPLETION_STATUS.disputed;

  if (!showPanel) return null;

  async function confirmComplete() {
    setError(null);
    setLoading("confirm");
    try {
      const res = await fetch(`/api/bookings/${booking.id}/confirm-complete`, {
        method: "POST",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not confirm");
      setSuccess("Booking completed. Thank you!");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm");
    } finally {
      setLoading(null);
    }
  }

  async function submitDispute() {
    if (reason.trim().length < 10) {
      setError("Please enter at least 10 characters.");
      return;
    }
    setError(null);
    setLoading("dispute");
    try {
      const res = await fetch(`/api/bookings/${booking.id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not submit dispute");
      setDisputeOpen(false);
      setSuccess("Dispute submitted. Our team will review it shortly.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit dispute");
    } finally {
      setLoading(null);
    }
  }

  if (
    completionStatus === COMPLETION_STATUS.customer_confirmed ||
    completionStatus === COMPLETION_STATUS.auto_completed ||
    booking.status === BOOKING_STATUS.completed
  ) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
        <strong className="font-semibold">Completed.</strong> This booking has
        been completed.
      </div>
    );
  }

  if (completionStatus === COMPLETION_STATUS.disputed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
        <strong className="font-semibold">Dispute under review.</strong> A
        dispute has been raised for this booking. Our team is reviewing it.
      </div>
    );
  }

  if (
    booking.status === BOOKING_STATUS.confirmed &&
    completionStatus === COMPLETION_STATUS.none &&
    booking.journey_started_at
  ) {
    return (
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-950">
        <strong className="font-semibold">Enjoy your journey!</strong> Your driver
        is on the way. They will mark the trip complete when delivered.
      </div>
    );
  }

  if (
    booking.status === BOOKING_STATUS.confirmed &&
    completionStatus === COMPLETION_STATUS.none
  ) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
        <strong className="font-semibold">Confirmed.</strong> Your operator is
        assigned and will start the journey when they head to pickup.
      </div>
    );
  }

  if (completionStatus === COMPLETION_STATUS.operator_marked_complete) {
    return (
      <>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sky-950">
            Your operator has marked this ride as complete
          </h2>
          <p className="mt-2 text-sm text-sky-900/90">
            Please confirm the ride was completed or raise a dispute if
            there&apos;s an issue.
          </p>
          {booking.auto_complete_at ? (
            <p className="mt-3 text-sm font-medium text-sky-800">
              Auto-completing in: {countdown}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-3 text-sm text-emerald-800" role="status">
              {success}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              loading={loading === "confirm"}
              disabled={loading !== null}
              onClick={() => void confirmComplete()}
              className="bg-emerald-600 hover:opacity-95"
            >
              Confirm completion
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={loading !== null}
              onClick={() => setDisputeOpen(true)}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Raise a dispute
            </Button>
          </div>
        </div>

        <Modal
          open={disputeOpen}
          onClose={() => setDisputeOpen(false)}
          title="Raise a dispute"
        >
          <p className="text-sm text-content/80">
            Describe the issue (minimum 10 characters).
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="What went wrong?"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDisputeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={loading === "dispute"}
              onClick={() => void submitDispute()}
              className="bg-red-600 hover:opacity-95"
            >
              Submit dispute
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  return null;
}
