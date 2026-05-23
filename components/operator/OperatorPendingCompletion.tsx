"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { StartJourneyConfirmModal } from "@/components/operator/StartJourneyConfirmModal";
import { useStartJourneyAction } from "@/components/operator/useStartJourneyAction";
import { Button } from "@/components/ui/Button";
import { formatBookingLuggage } from "@/lib/booking/luggage-display";
import type { Booking } from "@/types";

export type OperatorCompletionBooking = {
  id: string;
  reference: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_date: string;
  pickup_time: string;
  status: string;
  completion_status: string;
  auto_complete_at: string | null;
  journey_started_at: string | null;
  luggage: number;
  customer_name: string | null;
};

function formatTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function formatCountdown(iso: string | null): string {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Awaiting customer (due now)";
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  return `Customer confirm by: ${hours}h ${mins}m`;
}

function TripCard({
  booking,
  children,
}: {
  booking: OperatorCompletionBooking;
  children: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="font-semibold text-content">#{booking.reference}</p>
      <p className="text-sm text-content/70">
        {booking.customer_name ?? "Customer"} · {booking.pickup_date}{" "}
        {formatTime(booking.pickup_time)}
        {(booking.luggage ?? 0) > 0 ? (
          <> · {formatBookingLuggage(booking.luggage)}</>
        ) : null}
      </p>
      <p className="mt-2 text-sm text-content">
        {booking.pickup_address}
        <span className="block text-content/60">→ {booking.dropoff_address}</span>
      </p>
      {children}
    </article>
  );
}

function toBookingSlice(row: OperatorCompletionBooking): Booking {
  return row as unknown as Booking;
}

type OperatorPendingCompletionProps = {
  readyToStart: OperatorCompletionBooking[];
  enRoute: OperatorCompletionBooking[];
  awaitingCustomer: OperatorCompletionBooking[];
};

export function OperatorPendingCompletion({
  readyToStart,
  enRoute,
  awaitingCustomer,
}: OperatorPendingCompletionProps) {
  const router = useRouter();
  const [markBusyId, setMarkBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const {
    busyId: startBusyId,
    earlyStartBooking,
    requestStart,
    confirmEarlyStart,
    closeEarlyStartModal,
  } = useStartJourneyAction({
    onSuccess: () => {
      setToast("Journey started — customer notified.");
      window.setTimeout(() => setToast(null), 3000);
      router.refresh();
    },
    onError: (message) => {
      setToast(message);
      window.setTimeout(() => setToast(null), 4000);
    },
  });

  if (
    readyToStart.length === 0 &&
    enRoute.length === 0 &&
    awaitingCustomer.length === 0
  ) {
    return null;
  }

  async function handleConfirmEarlyStart() {
    const result = await confirmEarlyStart();
    if (!result.ok) {
      setToast(result.error ?? "Failed");
      window.setTimeout(() => setToast(null), 4000);
    }
  }

  async function markComplete(bookingId: string) {
    setMarkBusyId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/mark-complete`, {
        method: "POST",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not mark complete");
      setToast("Marked complete — customer notified.");
      window.setTimeout(() => setToast(null), 3000);
      router.refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed");
      window.setTimeout(() => setToast(null), 4000);
    } finally {
      setMarkBusyId(null);
    }
  }

  function actionBusyId(id: string): boolean {
    return startBusyId === id || markBusyId === id;
  }

  return (
    <section className="mt-6 space-y-4">
      <StartJourneyConfirmModal
        booking={earlyStartBooking}
        open={earlyStartBooking !== null}
        loading={startBusyId !== null}
        onClose={closeEarlyStartModal}
        onConfirm={() => void handleConfirmEarlyStart()}
      />

      {toast ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {toast}
        </p>
      ) : null}
      <h2 className="text-lg font-semibold text-primary">Active trips</h2>

      {readyToStart.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-content/70">
            Confirmed — start journey when you head to pickup
          </p>
          {readyToStart.map((b) => (
            <TripCard key={b.id} booking={b}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="mt-3"
                loading={actionBusyId(b.id)}
                onClick={() => requestStart(toBookingSlice(b))}
              >
                Start journey
              </Button>
            </TripCard>
          ))}
        </div>
      ) : null}

      {enRoute.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-content/70">
            En route — mark complete when delivered
          </p>
          {enRoute.map((b) => (
            <TripCard key={b.id} booking={b}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="mt-3"
                loading={actionBusyId(b.id)}
                onClick={() => void markComplete(b.id)}
              >
                Mark as complete
              </Button>
            </TripCard>
          ))}
        </div>
      ) : null}

      {awaitingCustomer.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-content/70">
            Awaiting customer confirmation
          </p>
          {awaitingCustomer.map((b) => (
            <article
              key={b.id}
              className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4"
            >
              <p className="font-semibold text-content">#{b.reference}</p>
              <p className="mt-1 text-sm text-amber-900">
                {formatCountdown(b.auto_complete_at)}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
