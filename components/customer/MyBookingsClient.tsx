"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Car,
  Check,
  Clock,
  Loader2,
  MapPin,
} from "lucide-react";
import { CancelBookingConfirmModal } from "@/components/booking/CancelBookingConfirmModal";
import { Button } from "@/components/ui/Button";
import {
  useCancelMyBooking,
  useMyBookings,
  type CustomerBookingRow,
} from "@/hooks/queries/useBookings";
import { CustomerTripStatusBadge, CustomerTripStatusBanner } from "@/components/booking/CustomerTripStatusBanner";
import { canCustomerCancelBooking } from "@/lib/booking/customer-booking-ui";
import {
  fetchCancellationPolicyClient,
  type ClientCancellationPolicy,
} from "@/lib/booking/fetch-cancellation-policy-client";
import { PLACEHOLDER } from "@/lib/format/display";
import { SITE_EMAILS } from "@/lib/site/contact";
import {
  COMPLETED_BOOKING_STATUSES,
  UPCOMING_BOOKING_STATUSES,
  type BookingStatus,
} from "@/lib/validations/enums";

type TabId = "upcoming" | "completed";

function isUpcomingBooking(b: CustomerBookingRow): boolean {
  return (UPCOMING_BOOKING_STATUSES as readonly BookingStatus[]).includes(
    b.status,
  );
}

function isCompletedTabBooking(b: CustomerBookingRow): boolean {
  return (COMPLETED_BOOKING_STATUSES as readonly BookingStatus[]).includes(
    b.status,
  );
}

function pickupMillis(b: CustomerBookingRow): number {
  const t = b.pickup_time.length >= 5 ? b.pickup_time.slice(0, 8) : b.pickup_time;
  return new Date(`${b.pickup_date}T${t}`).getTime();
}

function formatPickupLine(b: CustomerBookingRow): string {
  const t = b.pickup_time.length >= 5 ? b.pickup_time.slice(0, 5) : b.pickup_time;
  return `${b.pickup_date} at ${t}`;
}

function formatPrice(amount: number | null): string {
  if (amount == null || Number.isNaN(Number(amount))) return PLACEHOLDER;
  return `£${Number(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function operatorLabel(b: CustomerBookingRow): string {
  const op = b.operators;
  if (op?.business_name && op?.vehicle_type) {
    return `${op.business_name} - ${op.vehicle_type}`;
  }
  if (b.operator_id) {
    return "Operator assigned (details unavailable)";
  }
  return "Operator not assigned yet";
}

function BookingCard({
  booking,
  tab,
  onCancel,
  cancellingId,
}: {
  booking: CustomerBookingRow;
  tab: TabId;
  onCancel: (id: string) => void;
  cancellingId: string | null;
}) {
  const ref = `#${booking.reference}`;
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || SITE_EMAILS.bookings;

  const contactMailto =
    supportEmail != null && supportEmail.length > 0
      ? `mailto:${supportEmail}?subject=${encodeURIComponent(
          `Booking ${ref}`,
        )}&body=${encodeURIComponent(
          `Hello,\n\nI am writing about booking ${ref}.\n\n`,
        )}`
      : null;

  const showActions = tab === "upcoming";
  const canCancel = canCustomerCancelBooking(booking);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [cancelPolicy, setCancelPolicy] =
    useState<ClientCancellationPolicy | null>(null);

  async function openCancelModal() {
    setCancelConfirmOpen(true);
    setPolicyLoading(true);
    setCancelPolicy(null);
    try {
      const policy = await fetchCancellationPolicyClient(booking.id);
      setCancelPolicy(policy);
    } finally {
      setPolicyLoading(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-500">{ref}</span>
          {tab === "upcoming" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Upcoming
            </span>
          ) : booking.status === "cancelled" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
              Cancelled
            </span>
          ) : booking.payment_status === "refunded" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800 ring-1 ring-inset ring-violet-200">
              Refunded
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Completed
            </span>
          )}
          {tab === "upcoming" ? <CustomerTripStatusBadge booking={booking} /> : null}
        </div>
        <p className="text-xl font-bold tabular-nums text-primary sm:text-2xl">
          {formatPrice(booking.price)}
        </p>
      </div>

      <p className="mt-2 text-sm text-slate-500">{formatPickupLine(booking)}</p>

      <CustomerTripStatusBanner booking={booking} />

      <ul className="mt-5 space-y-4">
        <li className="flex gap-3">
          <MapPin
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
            aria-hidden
          />
          <div>
            <p className="text-xs font-medium text-slate-500">Pickup</p>
            <p className="text-sm font-medium text-content">{booking.pickup_address}</p>
          </div>
        </li>
        <li className="flex gap-3">
          <MapPin
            className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
            aria-hidden
          />
          <div>
            <p className="text-xs font-medium text-slate-500">Destination</p>
            <p className="text-sm font-medium text-content">{booking.dropoff_address}</p>
          </div>
        </li>
        <li className="flex gap-3">
          <Car
            className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
            aria-hidden
          />
          <div>
            <p className="text-xs font-medium text-slate-500">Operator</p>
            <p className="text-sm font-medium text-content">{operatorLabel(booking)}</p>
          </div>
        </li>
      </ul>

      {showActions && (
        <>
          <div className="my-5 border-t border-slate-100" />
          <div className="flex flex-col gap-3 sm:flex-row">
            {canCancel ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="flex-1 border-slate-300 font-semibold text-content"
                loading={cancellingId === booking.id}
                disabled={cancellingId !== null}
                onClick={() => void openCancelModal()}
              >
                Cancel booking
              </Button>
            ) : booking.journey_started_at ? (
              <p className="flex-1 text-sm text-slate-600">
                This booking can&apos;t be cancelled after your driver has
                started the journey.
              </p>
            ) : null}
            {contactMailto ? (
              <a
                href={contactMailto}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-primary bg-transparent px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Contact operator
              </a>
            ) : (
              <Link
                href="/#contact"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-primary bg-transparent px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Contact operator
              </Link>
            )}
          </div>
        </>
      )}

      <CancelBookingConfirmModal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        loading={cancellingId === booking.id}
        policyLoading={policyLoading}
        policySummary={cancelPolicy?.summary ?? null}
        policyDetail={cancelPolicy?.detail ?? null}
        policyBlocked={cancelPolicy != null && !cancelPolicy.allowed}
        bookingReference={booking.reference}
        onConfirm={() => {
          if (cancelPolicy && !cancelPolicy.allowed) return;
          void Promise.resolve(onCancel(booking.id)).finally(() => {
            setCancelConfirmOpen(false);
          });
        }}
      />
    </article>
  );
}

export function MyBookingsClient() {
  const { data: rows = [], isLoading, isError, error, refetch } = useMyBookings();
  const cancelMutation = useCancelMyBooking();
  const [tab, setTab] = useState<TabId>("upcoming");
  const [lastCancelError, setLastCancelError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const upcoming = useMemo(
    () =>
      rows
        .filter(isUpcomingBooking)
        .sort((a, b) => pickupMillis(a) - pickupMillis(b)),
    [rows],
  );

  const completed = useMemo(
    () =>
      rows
        .filter(isCompletedTabBooking)
        .sort((a, b) => pickupMillis(b) - pickupMillis(a)),
    [rows],
  );

  const list = tab === "upcoming" ? upcoming : completed;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          My Bookings
        </h1>
        <p className="mt-2 text-base text-slate-600">
          View and manage your ride bookings
        </p>
      </header>

      <div
        className="mt-8 inline-flex rounded-full bg-slate-200/80 p-1"
        role="tablist"
        aria-label="Booking filters"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "upcoming"}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition sm:px-5 ${
            tab === "upcoming"
              ? "bg-white text-primary shadow-sm"
              : "text-slate-600 hover:text-content"
          }`}
          onClick={() => {
            setTab("upcoming");
            setLastCancelError(null);
          }}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "completed"}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition sm:px-5 ${
            tab === "completed"
              ? "bg-white text-primary shadow-sm"
              : "text-slate-600 hover:text-content"
          }`}
          onClick={() => {
            setTab("completed");
            setLastCancelError(null);
          }}
        >
          Completed ({completed.length})
        </button>
      </div>

      {lastCancelError ? (
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <span>{lastCancelError}</span>
          <button
            type="button"
            className="font-semibold text-red-900 underline decoration-red-400 underline-offset-2 hover:no-underline"
            onClick={() => setLastCancelError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mt-8" role="tabpanel">
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span>Loading your bookings…</span>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-5 text-sm text-red-800">
            <p className="font-semibold">Could not load bookings</p>
            <p className="mt-1 opacity-90">{error?.message ?? "Unknown error"}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => void refetch()}
            >
              Try again
            </Button>
          </div>
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-5 py-12 text-center text-slate-600">
            {tab === "upcoming"
              ? "You have no upcoming rides. Book a trip to see it here."
              : "No completed rides yet."}
          </p>
        ) : (
          <ul className="space-y-5">
            {list.map((booking) => (
              <li key={booking.id}>
                <BookingCard
                  booking={booking}
                  tab={tab}
                  cancellingId={cancellingId}
                  onCancel={async (id) => {
                    setLastCancelError(null);
                    setCancellingId(id);
                    try {
                      await cancelMutation.mutateAsync(id);
                    } catch (e) {
                      const msg =
                        e instanceof Error ? e.message : "Could not cancel booking.";
                      setLastCancelError(msg);
                    } finally {
                      setCancellingId(null);
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
