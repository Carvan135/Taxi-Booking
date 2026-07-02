import { getCustomerTripStatus } from "@/lib/booking/customer-booking-ui";
import type { CustomerBookingRow } from "@/types";

type TripStatusBooking = Pick<
  CustomerBookingRow,
  | "status"
  | "journey_started_at"
  | "completion_status"
  | "payment_status"
  | "operator_id"
>;

export function CustomerTripStatusBadge({ booking }: { booking: TripStatusBooking }) {
  const status = getCustomerTripStatus(booking);
  if (!status) return null;

  const isEnRoute = status.variant === "en_route";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        isEnRoute
          ? "bg-sky-100 text-sky-900 ring-sky-200"
          : "bg-amber-50 text-amber-900 ring-amber-200"
      }`}
    >
      {status.badge}
    </span>
  );
}

export function CustomerTripStatusBanner({ booking }: { booking: TripStatusBooking }) {
  const status = getCustomerTripStatus(booking);
  if (!status) return null;

  const isEnRoute = status.variant === "en_route";

  return (
    <div
      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
        isEnRoute
          ? "border-sky-200 bg-sky-50 text-sky-950"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
      role="status"
    >
      <p className="font-semibold">{status.title}</p>
      <p className={`mt-1 ${isEnRoute ? "text-sky-900/90" : "text-amber-900/90"}`}>
        {status.message}
      </p>
    </div>
  );
}
