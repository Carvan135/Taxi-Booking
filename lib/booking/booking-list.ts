import {
  BOOKING_LEG,
  BOOKING_STATUS,
  COMPLETED_BOOKING_STATUSES,
  UPCOMING_BOOKING_STATUSES,
  type BookingLeg,
  type BookingStatus,
} from "@/lib/validations/enums";
import type { CustomerBookingRow } from "@/types";

export { BOOKING_STATUS, UPCOMING_BOOKING_STATUSES, COMPLETED_BOOKING_STATUSES };

export type BookingDisplayGroup =
  | { kind: "single"; booking: CustomerBookingRow }
  | { kind: "return"; groupReference: string; legs: CustomerBookingRow[] };

export function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isUpcomingStatus(status: BookingStatus): boolean {
  return (UPCOMING_BOOKING_STATUSES as readonly BookingStatus[]).includes(
    status,
  );
}

export function isCompletedTabStatus(status: BookingStatus): boolean {
  return (COMPLETED_BOOKING_STATUSES as readonly BookingStatus[]).includes(
    status,
  );
}

export function isUpcomingBooking(booking: CustomerBookingRow): boolean {
  return (
    isUpcomingStatus(booking.status) &&
    booking.pickup_date >= todayDateString()
  );
}

export function isCompletedTabBooking(booking: CustomerBookingRow): boolean {
  return isCompletedTabStatus(booking.status);
}

export function sortByCreatedAtDesc(
  a: CustomerBookingRow,
  b: CustomerBookingRow,
): number {
  return (
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function groupBookingsForDisplay(
  bookings: CustomerBookingRow[],
): BookingDisplayGroup[] {
  const sorted = [...bookings].sort(sortByCreatedAtDesc);
  const seenGroups = new Set<string>();
  const seenIds = new Set<string>();
  const groups: BookingDisplayGroup[] = [];

  for (const booking of sorted) {
    if (seenIds.has(booking.id)) continue;

    if (booking.group_reference) {
      if (seenGroups.has(booking.group_reference)) continue;
      seenGroups.add(booking.group_reference);

      const legs = sorted
        .filter((b) => b.group_reference === booking.group_reference)
        .sort((a, b) => legSortOrder(a.leg) - legSortOrder(b.leg));

      legs.forEach((l) => seenIds.add(l.id));
      groups.push({
        kind: "return",
        groupReference: booking.group_reference,
        legs,
      });
    } else {
      seenIds.add(booking.id);
      groups.push({ kind: "single", booking });
    }
  }

  return groups;
}

function legSortOrder(leg: BookingLeg): number {
  return leg === BOOKING_LEG.outbound ? 0 : 1;
}
