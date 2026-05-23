import { BOOKING_STATUS, type BookingStatus } from "@/lib/validations/enums";

const STATUS_LABELS: Record<BookingStatus, string> = {
  [BOOKING_STATUS.pending]: "Pending",
  [BOOKING_STATUS.confirmed]: "Confirmed",
  [BOOKING_STATUS.completed]: "Completed",
  [BOOKING_STATUS.cancelled]: "Cancelled",
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  [BOOKING_STATUS.pending]: "bg-amber-50 text-amber-900 ring-amber-200",
  [BOOKING_STATUS.confirmed]: "bg-blue-50 text-blue-800 ring-blue-200",
  [BOOKING_STATUS.completed]: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  [BOOKING_STATUS.cancelled]: "bg-red-50 text-red-800 ring-red-200",
};

type BookingStatusBadgeProps = {
  status: BookingStatus;
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
