"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Luggage,
  MapPin,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OperatorBookingsListSkeleton } from "@/components/operator/OperatorBookingCardSkeleton";
import { BookingStatusBadge } from "@/components/booking/BookingStatusBadge";
import { CustomerContactDetailsModal } from "@/components/operator/CustomerContactDetailsModal";
import { StartJourneyConfirmModal } from "@/components/operator/StartJourneyConfirmModal";
import { useStartJourneyAction } from "@/components/operator/useStartJourneyAction";
import { Button } from "@/components/ui/Button";
import { formatBookingLuggage } from "@/lib/booking/luggage-display";
import { bookingKeys } from "@/hooks/queries/keys";
import { useOperatorBookings } from "@/hooks/queries/useBookings";
import {
  canMarkComplete,
  canStartJourney,
  completionLabel,
  filterOperatorBookings,
  formatCountdown,
  formatMoney,
  formatPickupLine,
  isAwaitingPayment,
  isPastBooking,
  journeyStatusLabel,
  legLabel,
  paymentStatusLabel,
  sortBookingsForOperator,
  type OperatorBookingsTab,
} from "@/lib/booking/operator-booking-list";
import { groupBookingsForDisplay } from "@/lib/booking/booking-list";
import type { Booking } from "@/types";
import type { BookingStatus } from "@/lib/validations/enums";

const TABS: { id: OperatorBookingsTab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

function TabButton({
  id,
  label,
  count,
  active,
  onSelect,
}: {
  id: string;
  label: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`op-tab-${id}`}
      aria-selected={active}
      className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition sm:flex-none sm:px-4 ${
        active
          ? "bg-white text-primary shadow-sm"
          : "text-slate-600 hover:text-content"
      }`}
      onClick={onSelect}
    >
      {label} ({count})
    </button>
  );
}

function PaymentBadge({ booking }: { booking: Booking }) {
  const paid = booking.payment_status === "paid";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${
        paid
          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
          : booking.payment_status === "failed"
            ? "bg-red-50 text-red-800 ring-red-200"
            : "bg-amber-50 text-amber-900 ring-amber-200"
      }`}
    >
      {paymentStatusLabel(booking.payment_status)}
    </span>
  );
}

function OperatorBookingCard({
  booking,
  busyId,
  onStartJourney,
  onMarkComplete,
}: {
  booking: Booking;
  busyId: string | null;
  onStartJourney: (booking: Booking) => void;
  onMarkComplete: (id: string) => void;
}) {
  const completion = completionLabel(booking.completion_status);
  const leg = legLabel(booking.leg);
  const tripPhase = journeyStatusLabel(booking);
  const showStart = canStartJourney(booking);
  const showComplete = canMarkComplete(booking);
  const awaitingPayment = isAwaitingPayment(booking);

  const email = booking.customer_email?.trim() || null;
  const phone = booking.customer_phone?.trim() || null;
  const [contactOpen, setContactOpen] = useState(false);
  const showContact = (email || phone) && !isPastBooking(booking);

  return (
    <article
      id={`booking-${booking.id}`}
      className="scroll-mt-24 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-shadow"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-semibold text-content">#{booking.reference}</span>
          {leg ? (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-content/70">
              {leg}
            </span>
          ) : null}
          <BookingStatusBadge status={booking.status as BookingStatus} />
          <PaymentBadge booking={booking} />
        </div>
        <p className="text-lg font-bold tabular-nums text-primary">
          {formatMoney(booking.operator_payout ?? booking.price)}
        </p>
      </div>

      {tripPhase ? (
        <p className="mt-2 text-sm font-medium text-sky-900">{tripPhase}</p>
      ) : null}

      {completion ? (
        <p className="mt-2 text-sm font-medium text-amber-900">{completion}</p>
      ) : null}

      {booking.completion_status === "operator_marked_complete" &&
      booking.auto_complete_at ? (
        <p className="mt-1 text-xs text-content/60">
          {formatCountdown(booking.auto_complete_at)}
        </p>
      ) : null}

      <p className="mt-2 text-sm text-content/70">{formatPickupLine(booking)}</p>

      <div className="mt-4 space-y-2 text-sm text-content">
        <p className="font-medium">
          {booking.customer_name?.trim() || "Customer"}
        </p>
        <p className="flex gap-2 text-content/80">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
          <span>
            {booking.pickup_address}
            <span className="block text-content/60">
              to {booking.dropoff_address}
            </span>
          </span>
        </p>
        <p className="flex items-center gap-2 text-content/70">
          <Users className="h-4 w-4 shrink-0" aria-hidden />
          {booking.passengers} passenger{booking.passengers === 1 ? "" : "s"} ·{" "}
          {booking.service_type}
          {booking.vehicle_type ? ` · ${booking.vehicle_type}` : ""}
        </p>
        {(booking.luggage ?? 0) > 0 ? (
          <p className="flex items-center gap-2 text-content/70">
            <Luggage className="h-4 w-4 shrink-0" aria-hidden />
            {formatBookingLuggage(booking.luggage)}
          </p>
        ) : null}
      </div>

      {booking.notes?.trim() ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-content/80">
          <span className="font-medium text-content/60">Notes: </span>
          {booking.notes.trim()}
        </p>
      ) : null}

      <CustomerContactDetailsModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        customerName={booking.customer_name?.trim() || "Customer"}
        email={email}
        phone={phone}
        bookingReference={booking.reference}
      />

      {awaitingPayment ? (
        <p className="mt-4 text-sm text-amber-900">
          Payment is not confirmed yet. Actions unlock once the customer&apos;s
          payment clears.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {showContact ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setContactOpen(true)}
          >
            View Contact Details
          </Button>
        ) : null}
        {showStart ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={busyId === booking.id}
            onClick={() => onStartJourney(booking)}
          >
            Start journey
          </Button>
        ) : null}
        {showComplete ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={busyId === booking.id}
            onClick={() => onMarkComplete(booking.id)}
          >
            Mark as complete
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function OperatorBookingsClient() {
  const searchParams = useSearchParams();
  const highlightBookingId = searchParams.get("booking");
  const queryClient = useQueryClient();
  const { data: bookings = [], isLoading, error } = useOperatorBookings();
  const [tab, setTab] = useState<OperatorBookingsTab>("upcoming");
  const [markBusyId, setMarkBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/operator/reconcile-payments", { method: "POST" })
      .then((res) => {
        if (res.ok) {
          void queryClient.invalidateQueries({ queryKey: bookingKeys.operator });
        }
      })
      .catch(() => {
        /* non-blocking */
      });
  }, [queryClient]);

  const sorted = useMemo(
    () => [...bookings].sort(sortBookingsForOperator),
    [bookings],
  );

  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [t.id, filterOperatorBookings(sorted, t.id).length]),
      ) as Record<OperatorBookingsTab, number>,
    [sorted],
  );

  const filtered = useMemo(
    () => filterOperatorBookings(sorted, tab),
    [sorted, tab],
  );

  const groups = useMemo(
    () =>
      groupBookingsForDisplay(
        filtered as Parameters<typeof groupBookingsForDisplay>[0],
      ),
    [filtered],
  );

  useEffect(() => {
    if (!highlightBookingId || isLoading || bookings.length === 0) return;

    const highlighted = bookings.find((b) => b.id === highlightBookingId);
    if (highlighted) {
      const wantsUpcoming = !isPastBooking(highlighted);
      if (wantsUpcoming && tab !== "upcoming") {
        setTab("upcoming");
        return;
      }
      if (!wantsUpcoming && tab !== "completed") {
        setTab("completed");
        return;
      }
    }

    const el = document.getElementById(`booking-${highlightBookingId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-secondary", "ring-offset-2");
    const timer = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-secondary", "ring-offset-2");
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [highlightBookingId, isLoading, bookings, tab]);

  function showToast(message: string, isError = false) {
    setToast({ message, isError });
    window.setTimeout(() => setToast(null), isError ? 5000 : 3000);
  }

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: bookingKeys.operator });
  }

  const {
    busyId: startBusyId,
    earlyStartBooking,
    requestStart,
    confirmEarlyStart,
    closeEarlyStartModal,
  } = useStartJourneyAction({
    onSuccess: async () => {
      showToast("Journey started. Customer notified.");
      await invalidate();
    },
    onError: (message) => showToast(message, true),
  });

  async function handleConfirmEarlyStart() {
    const result = await confirmEarlyStart();
    if (!result.ok) {
      showToast(result.error ?? "Could not start journey", true);
    }
  }

  function cardBusyId(bookingId: string): string | null {
    if (startBusyId === bookingId || markBusyId === bookingId) return bookingId;
    return null;
  }

  async function markComplete(bookingId: string) {
    setMarkBusyId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/mark-complete`, {
        method: "POST",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not mark complete");
      showToast("Marked complete. Customer notified.");
      await invalidate();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not mark complete",
        true,
      );
    } finally {
      setMarkBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <StartJourneyConfirmModal
        booking={earlyStartBooking}
        open={earlyStartBooking !== null}
        loading={startBusyId !== null}
        onClose={closeEarlyStartModal}
        onConfirm={() => void handleConfirmEarlyStart()}
      />
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
          <Calendar className="h-8 w-8 shrink-0 text-secondary" aria-hidden />
          Bookings
        </h1>
        <p className="mt-2 text-sm text-content/70 sm:text-base">
          Manage assigned trips: start journeys, mark completion, and contact
          customers.
        </p>
      </header>

      <div
        className="mt-8 flex w-full flex-wrap gap-1 rounded-full bg-slate-200/80 p-1 sm:w-auto"
        role="tablist"
        aria-label="Booking filters"
      >
        {TABS.map((t) => (
          <TabButton
            key={t.id}
            id={t.id}
            label={t.label}
            count={tabCounts[t.id]}
            active={tab === t.id}
            onSelect={() => setTab(t.id)}
          />
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {toast ? (
          <p
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              toast.isError
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
            role="status"
          >
            {toast.message}
          </p>
        ) : null}

        {isLoading ? (
          <OperatorBookingsListSkeleton count={4} />
        ) : error ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            Could not load bookings. Please refresh the page.
          </p>
        ) : groups.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <ul className="space-y-5">
            {groups.map((group) => (
              <li key={groupKey(group)}>
                {group.kind === "return" ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-content/50">
                      Return trip · {group.groupReference}
                    </p>
                    {group.legs.map((leg) => (
                      <OperatorBookingCard
                        key={leg.id}
                        booking={leg as Booking}
                        busyId={cardBusyId(leg.id)}
                        onStartJourney={requestStart}
                        onMarkComplete={markComplete}
                      />
                    ))}
                  </div>
                ) : (
                  <OperatorBookingCard
                    booking={group.booking as Booking}
                    busyId={cardBusyId(group.booking.id)}
                    onStartJourney={requestStart}
                    onMarkComplete={markComplete}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function groupKey(
  group: ReturnType<typeof groupBookingsForDisplay>[number],
): string {
  if (group.kind === "return") return `grp-${group.groupReference}`;
  return group.booking.id;
}

function EmptyState({ tab }: { tab: OperatorBookingsTab }) {
  if (tab === "upcoming") {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 py-12 text-center text-content/70 shadow-sm">
        No upcoming bookings assigned to you.
      </p>
    );
  }

  return (
    <p className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 py-12 text-center text-content/70 shadow-sm">
      No completed bookings yet.
    </p>
  );
}
