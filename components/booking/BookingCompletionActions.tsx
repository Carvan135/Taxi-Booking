"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Booking } from "@/types";

function formatCountdown(iso: string | null): string {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Completing soon…";
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} minutes`;
}

type BookingCompletionActionsProps = {
  booking: Pick<
    Booking,
    "id" | "auto_complete_at" | "completion_status" | "status"
  >;
  /** Compact layout for booking list cards. */
  compact?: boolean;
  /** Called after customer confirms completion (before refresh). */
  onAfterConfirm?: () => void;
  /** Optional refresh instead of router.refresh(). */
  onRefresh?: () => void;
};

export function BookingCompletionActions({
  booking,
  compact = false,
  onAfterConfirm,
  onRefresh,
}: BookingCompletionActionsProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(
    formatCountdown(booking.auto_complete_at),
  );
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"confirm" | "dispute" | null>(null);

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(booking.auto_complete_at));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [booking.auto_complete_at]);

  function refresh() {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  }

  async function confirmComplete() {
    setError(null);
    setLoading("confirm");
    try {
      const res = await fetch(`/api/bookings/${booking.id}/confirm-complete`, {
        method: "POST",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not confirm");
      onAfterConfirm?.();
      refresh();
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
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit dispute");
    } finally {
      setLoading(null);
    }
  }

  const boxClass = compact
    ? "mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3"
    : "rounded-xl border border-sky-200 bg-sky-50 p-5 shadow-sm";

  return (
    <>
      <div className={boxClass}>
        <p className="text-sm font-semibold text-sky-950">
          Operator marked this ride complete
        </p>
        <p className="mt-1 text-sm text-sky-900/90">
          Confirm delivery or raise a dispute if something went wrong.
        </p>
        {booking.auto_complete_at ? (
          <p className="mt-2 text-xs font-medium text-sky-800">
            Auto-completing in: {countdown}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div
          className={
            compact
              ? "mt-3 flex flex-col gap-2 sm:flex-row"
              : "mt-4 flex flex-wrap gap-3"
          }
        >
          <Button
            type="button"
            variant="primary"
            size={compact ? "sm" : "md"}
            loading={loading === "confirm"}
            disabled={loading !== null}
            onClick={() => void confirmComplete()}
            className={
              compact
                ? "bg-emerald-600 hover:opacity-95 sm:flex-1"
                : "bg-emerald-600 hover:opacity-95"
            }
          >
            Confirm completion
          </Button>
          <Button
            type="button"
            variant="secondary"
            size={compact ? "sm" : "md"}
            disabled={loading !== null}
            onClick={() => setDisputeOpen(true)}
            className={
              compact
                ? "border-red-300 text-red-700 hover:bg-red-50 sm:flex-1"
                : "border-red-300 text-red-700 hover:bg-red-50"
            }
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
