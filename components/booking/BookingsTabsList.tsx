"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookingCard } from "@/components/booking/BookingCard";
import { ReturnTripGroup } from "@/components/booking/ReturnTripGroup";
import { Button } from "@/components/ui/Button";
import { useCancelMyBooking } from "@/hooks/queries/useBookings";
import {
  groupBookingsForDisplay,
  isCompletedTabBooking,
  isUpcomingBooking,
  type BookingDisplayGroup,
} from "@/lib/booking/booking-list";
import type { CustomerBookingRow } from "@/types";

type TabId = "upcoming" | "completed";

type BookingsTabsListProps = {
  bookings: CustomerBookingRow[];
  title?: string;
  subtitle?: string;
  /** Allow cancel + contact actions (logged-in customer bookings page). */
  enableManageActions?: boolean;
};

export function BookingsTabsList({
  bookings,
  title = "My Bookings",
  subtitle = "View and manage your ride bookings",
  enableManageActions = false,
}: BookingsTabsListProps) {
  const router = useRouter();
  const cancelMutation = useCancelMyBooking();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("upcoming");

  const upcomingGroups = useMemo(() => {
    const filtered = bookings.filter(isUpcomingBooking);
    return groupBookingsForDisplay(filtered);
  }, [bookings]);

  const completedGroups = useMemo(() => {
    const filtered = bookings.filter(isCompletedTabBooking);
    return groupBookingsForDisplay(filtered);
  }, [bookings]);

  const groups = tab === "upcoming" ? upcomingGroups : completedGroups;
  const upcomingCount = countLegs(upcomingGroups);
  const completedCount = countLegs(completedGroups);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-base text-slate-600">{subtitle}</p>
      </header>

      <div
        className="mt-8 inline-flex w-full rounded-full bg-slate-200/80 p-1 sm:w-auto"
        role="tablist"
        aria-label="Booking filters"
      >
        <TabButton
          id="upcoming"
          label="Upcoming"
          count={upcomingCount}
          active={tab === "upcoming"}
          onSelect={() => setTab("upcoming")}
        />
        <TabButton
          id="completed"
          label="Completed"
          count={completedCount}
          active={tab === "completed"}
          onSelect={() => setTab("completed")}
        />
      </div>

      <div className="mt-8" role="tabpanel">
        {cancelError ? (
          <p
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {cancelError}
          </p>
        ) : null}
        {groups.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <ul className="space-y-5">
            {groups.map((group) => (
              <li key={groupKey(group)}>
                <BookingGroupItem
                  group={group}
                  showActions={tab === "upcoming"}
                  cancellingId={cancellingId}
                  onCancel={
                    enableManageActions
                      ? async (id) => {
                          setCancelError(null);
                          setCancellingId(id);
                          try {
                            await cancelMutation.mutateAsync(id);
                            router.refresh();
                          } catch (e) {
                            setCancelError(
                              e instanceof Error
                                ? e.message
                                : "Could not cancel booking.",
                            );
                          } finally {
                            setCancellingId(null);
                          }
                        }
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

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
      id={`tab-${id}`}
      aria-selected={active}
      className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition sm:flex-none sm:px-5 ${
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

function BookingGroupItem({
  group,
  showActions,
  onCancel,
  cancellingId,
}: {
  group: BookingDisplayGroup;
  showActions: boolean;
  onCancel?: (id: string) => void;
  cancellingId: string | null;
}) {
  if (group.kind === "return") {
    return (
      <ReturnTripGroup
        legs={group.legs}
        showActions={showActions}
        onCancel={onCancel}
        cancellingId={cancellingId}
      />
    );
  }

  return (
    <BookingCard
      booking={group.booking}
      showActions={showActions}
      onCancel={onCancel}
      cancellingId={cancellingId}
    />
  );
}

function EmptyState({ tab }: { tab: TabId }) {
  if (tab === "upcoming") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 py-12 text-center shadow-sm">
        <p className="text-slate-600">
          No upcoming bookings. Ready to book your next ride?
        </p>
        <Link href="/book" className="mt-5 inline-block">
          <Button type="button" size="md">
            Book a Ride
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <p className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 py-12 text-center text-slate-600 shadow-sm">
      No completed bookings yet
    </p>
  );
}

function groupKey(group: BookingDisplayGroup): string {
  if (group.kind === "return") return `grp-${group.groupReference}`;
  return group.booking.id;
}

function countLegs(groups: BookingDisplayGroup[]): number {
  return groups.reduce(
    (n, g) => n + (g.kind === "return" ? g.legs.length : 1),
    0,
  );
}
