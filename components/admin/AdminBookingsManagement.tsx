"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminBookingStatusBadge } from "@/components/admin/AdminBookingStatusBadge";
import { AdminBookingsFilters } from "@/components/admin/AdminBookingsFilters";
import { AdminBookingsPagination } from "@/components/admin/AdminBookingsPagination";
import type { AdminBookingsListParams } from "@/lib/booking/admin-bookings-query";
import type {
  AdminBookingRow,
  AdminBookingsSummary,
  OperatorFilterOption,
} from "@/lib/booking/fetch-admin-bookings";
import {
  resolveDisputeCustomerWins,
  resolveDisputeOperatorWins,
} from "@/lib/actions/adminDisputes";
import {
  useMarkBookingCompleteMutation,
  useReleasePayoutMutation,
} from "@/hooks/queries/useAdminBookings";
import { BOOKING_STATUS, COMPLETION_STATUS } from "@/lib/validations/enums";

function formatMoney(amount: number | null): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return `£${Number(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPickupDate(booking: AdminBookingRow): string {
  const t =
    booking.pickup_time.length >= 5
      ? booking.pickup_time.slice(0, 5)
      : booking.pickup_time;
  return `${booking.pickup_date} · ${t}`;
}

function customerName(booking: AdminBookingRow): string {
  return (
    booking.profiles?.full_name?.trim() ||
    booking.customer_name?.trim() ||
    "Guest"
  );
}

function operatorName(booking: AdminBookingRow): string {
  return booking.operators?.business_name ?? "—";
}

type AdminBookingsManagementProps = {
  bookings: AdminBookingRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  summary: AdminBookingsSummary;
  query: AdminBookingsListParams;
  filterOperators: OperatorFilterOption[];
};

export function AdminBookingsManagement({
  bookings,
  totalCount,
  page,
  totalPages,
  pageSize,
  summary,
  query,
  filterOperators,
}: AdminBookingsManagementProps) {
  const router = useRouter();
  const completeMutation = useMarkBookingCompleteMutation();
  const releasePayoutMutation = useReleasePayoutMutation();

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function handleReleasePayout(bookingId: string) {
    setActionError(null);
    const key = `${bookingId}:payout`;
    setBusyKey(key);
    try {
      await releasePayoutMutation.mutateAsync(bookingId);
      router.refresh();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not release payout",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDisputeResolve(
    bookingId: string,
    winner: "customer" | "operator",
  ) {
    setActionError(null);
    const key = `${bookingId}:dispute-${winner}`;
    setBusyKey(key);
    try {
      const res =
        winner === "customer"
          ? await resolveDisputeCustomerWins(bookingId)
          : await resolveDisputeOperatorWins(bookingId);
      if (!res.success) {
        setActionError(res.error ?? "Could not resolve dispute.");
      } else {
        router.refresh();
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function handleComplete(bookingId: string) {
    setActionError(null);
    const key = `${bookingId}:complete`;
    setBusyKey(key);
    try {
      await completeMutation.mutateAsync(bookingId);
      router.refresh();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not mark booking complete",
      );
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
            Bookings Management
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Monitor and manage all platform bookings
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SummaryCard
            label="Total Bookings"
            value={String(summary.totalBookings)}
          />
          <SummaryCard
            label="Total Revenue"
            value={formatMoney(summary.totalRevenue)}
          />
          <SummaryCard
            label="Total Commission"
            value={formatMoney(summary.totalCommission)}
          />
          <SummaryCard
            label="Completion Rate"
            value={`${summary.completionRate}%`}
          />
          <SummaryCard
            label="Open Disputes"
            value={String(summary.disputedCount)}
            variant="danger"
          />
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
          <AdminBookingsFilters
            query={query}
            filterOperators={filterOperators}
          />

          {actionError ? (
            <p
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {actionError}
            </p>
          ) : null}

          {bookings.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center text-sm text-[#6B7280]">
              No bookings match your filters.
            </p>
          ) : (
            <>
              <ul className="mt-6 flex flex-col gap-4 lg:hidden">
                {bookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    busyKey={busyKey}
                    onComplete={handleComplete}
                    onReleasePayout={handleReleasePayout}
                    onDisputeResolve={handleDisputeResolve}
                  />
                  ))}
                </ul>

              <div className="mt-6 hidden lg:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      <th className="px-4 py-4">Booking ID</th>
                      <th className="px-4 py-4">Customer</th>
                      <th className="px-4 py-4">Operator</th>
                      <th className="min-w-[12rem] px-4 py-4">Route</th>
                      <th className="whitespace-nowrap px-4 py-4">
                        Date &amp; Time
                      </th>
                      <th className="whitespace-nowrap px-4 py-4">Price</th>
                      <th className="whitespace-nowrap px-4 py-4">
                        Commission
                      </th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((booking) => (
                      <BookingTableRow
                        key={booking.id}
                        booking={booking}
                        busyKey={busyKey}
                        onComplete={handleComplete}
                        onReleasePayout={handleReleasePayout}
                        onDisputeResolve={handleDisputeResolve}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <AdminBookingsPagination
            query={query}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
          />
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "danger";
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        variant === "danger"
          ? "border-red-200/80 bg-red-50"
          : "border-slate-200/80 bg-white"
      }`}
    >
      <p
        className={`text-sm font-medium ${variant === "danger" ? "text-red-800" : "text-[#6B7280]"}`}
      >
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold tracking-tight ${variant === "danger" ? "text-red-900" : "text-[#111827]"}`}
      >
        {value}
      </p>
    </div>
  );
}

function BookingCard({
  booking,
  busyKey,
  onComplete,
  onReleasePayout,
  onDisputeResolve,
}: {
  booking: AdminBookingRow;
  busyKey: string | null;
  onComplete: (bookingId: string) => void;
  onReleasePayout: (bookingId: string) => void;
  onDisputeResolve: (bookingId: string, winner: "customer" | "operator") => void;
}) {
  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#111827]">#{booking.reference}</p>
          <p className="mt-1 text-sm text-[#374151]">{customerName(booking)}</p>
        </div>
        <AdminBookingStatusBadge status={booking.status} />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="shrink-0 text-[#6B7280]">Operator</dt>
          <dd className="text-right font-medium text-[#374151]">
            {operatorName(booking)}
          </dd>
        </div>
        <div>
          <dt className="text-[#6B7280]">Route</dt>
          <dd className="mt-0.5 text-[#374151]">{booking.pickup_address}</dd>
          <dd className="mt-0.5 text-xs text-[#6B7280]">
            → {booking.dropoff_address}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#6B7280]">Pickup</dt>
          <dd className="text-right text-[#374151]">
            {formatPickupDate(booking)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#6B7280]">Price</dt>
          <dd className="font-semibold tabular-nums text-[#111827]">
            {formatMoney(booking.price)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#6B7280]">Commission</dt>
          <dd className="font-semibold tabular-nums text-[#111827]">
            {formatMoney(booking.platform_commission)}
          </dd>
        </div>
      </dl>

      <BookingActions
        booking={booking}
        busyKey={busyKey}
        onComplete={onComplete}
        onReleasePayout={onReleasePayout}
        onDisputeResolve={onDisputeResolve}
        layout="card"
      />
    </li>
  );
}

function BookingTableRow({
  booking,
  busyKey,
  onComplete,
  onReleasePayout,
  onDisputeResolve,
}: {
  booking: AdminBookingRow;
  busyKey: string | null;
  onComplete: (bookingId: string) => void;
  onReleasePayout: (bookingId: string) => void;
  onDisputeResolve: (bookingId: string, winner: "customer" | "operator") => void;
}) {
  return (
    <tr className="hover:bg-slate-50/80">
      <td className="whitespace-nowrap px-4 py-5 font-medium text-[#111827]">
        #{booking.reference}
      </td>
      <td className="px-4 py-5 text-[#374151]">{customerName(booking)}</td>
      <td className="px-4 py-5 text-[#374151]">{operatorName(booking)}</td>
      <td className="max-w-xs px-4 py-5 text-[#374151]">
        <span className="line-clamp-2">{booking.pickup_address}</span>
        <span className="mt-1 block text-xs leading-relaxed text-[#6B7280]">
          → {booking.dropoff_address}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-5 text-[#374151]">
        {formatPickupDate(booking)}
      </td>
      <td className="whitespace-nowrap px-4 py-5 font-semibold tabular-nums text-[#111827]">
        {formatMoney(booking.price)}
      </td>
      <td className="whitespace-nowrap px-4 py-5 font-semibold tabular-nums text-[#111827]">
        {formatMoney(booking.platform_commission)}
      </td>
      <td className="px-4 py-5">
        <AdminBookingStatusBadge status={booking.status} />
      </td>
      <td className="px-4 py-5 text-right">
        <BookingActions
          booking={booking}
          busyKey={busyKey}
          onComplete={onComplete}
          onReleasePayout={onReleasePayout}
          onDisputeResolve={onDisputeResolve}
          layout="table"
        />
      </td>
    </tr>
  );
}

function BookingActions({
  booking,
  busyKey,
  onComplete,
  onReleasePayout,
  onDisputeResolve,
  layout,
}: {
  booking: AdminBookingRow;
  busyKey: string | null;
  onComplete: (bookingId: string) => void;
  onReleasePayout: (bookingId: string) => void;
  onDisputeResolve: (bookingId: string, winner: "customer" | "operator") => void;
  layout: "card" | "table";
}) {
  const isCompleting = busyKey === `${booking.id}:complete`;
  const isReleasingPayout = busyKey === `${booking.id}:payout`;
  const align =
    layout === "card"
      ? "mt-4 flex flex-wrap gap-2"
      : "flex flex-col items-end gap-2";

  const canAdminComplete =
    booking.status === BOOKING_STATUS.confirmed &&
    Boolean(booking.operator_id) &&
    booking.completion_status === COMPLETION_STATUS.none;

  const canReleasePayout =
    booking.status === BOOKING_STATUS.completed &&
    !booking.payout_released_at &&
    Boolean(booking.operator_id);

  return (
    <div className={align}>
      <Link
        href={`/admin/bookings/${booking.id}`}
        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] hover:bg-slate-50"
      >
        View
      </Link>
      {canAdminComplete ? (
        <button
          type="button"
          disabled={isCompleting}
          onClick={() => void onComplete(booking.id)}
          className="rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isCompleting ? "Saving…" : "Mark complete"}
        </button>
      ) : null}
      {canReleasePayout ? (
        <button
          type="button"
          disabled={isReleasingPayout}
          onClick={() => void onReleasePayout(booking.id)}
          className="rounded-lg border border-secondary bg-secondary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60"
        >
          {isReleasingPayout ? "Releasing…" : "Release payout early"}
        </button>
      ) : null}
      {booking.completion_status === COMPLETION_STATUS.disputed ? (
        <>
          <button
            type="button"
            disabled={busyKey !== null}
            onClick={() => void onDisputeResolve(booking.id, "customer")}
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
          >
            Resolve — customer wins
          </button>
          <button
            type="button"
            disabled={busyKey !== null}
            onClick={() => void onDisputeResolve(booking.id, "operator")}
            className="rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Resolve — operator wins
          </button>
        </>
      ) : null}
    </div>
  );
}

