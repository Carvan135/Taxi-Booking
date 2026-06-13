import { BOOKING_STATUS, type BookingStatus } from "@/lib/validations/enums";

const STATUS_LABELS: Record<BookingStatus, string> = {
  [BOOKING_STATUS.pending]: "Pending",
  [BOOKING_STATUS.confirmed]: "Confirmed",
  [BOOKING_STATUS.completed]: "Completed",
  [BOOKING_STATUS.cancelled]: "Cancelled",
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  [BOOKING_STATUS.pending]: "bg-amber-100 text-amber-950 ring-amber-200",
  [BOOKING_STATUS.confirmed]: "bg-slate-100 text-slate-900 ring-slate-200",
  [BOOKING_STATUS.completed]: "bg-emerald-100 text-emerald-950 ring-emerald-200",
  [BOOKING_STATUS.cancelled]: "bg-red-100 text-red-950 ring-red-200",
};

type AdminBookingStatusBadgeProps = {
  status: BookingStatus | string;
};

export function AdminBookingStatusBadge({ status }: AdminBookingStatusBadgeProps) {
  const key = (status in STATUS_STYLES ? status : BOOKING_STATUS.pending) as BookingStatus;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[key]}`}
    >
      {STATUS_LABELS[key]}
    </span>
  );
}
