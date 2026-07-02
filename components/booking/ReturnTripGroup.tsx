import { BookingCard } from "@/components/booking/BookingCard";
import { PLACEHOLDER } from "@/lib/format/display";
import { BOOKING_LEG } from "@/lib/validations/enums";
import type { CustomerBookingRow } from "@/types";

type ReturnTripGroupProps = {
  legs: CustomerBookingRow[];
  showActions?: boolean;
  onCancel?: (bookingId: string) => void;
  cancellingId?: string | null;
  lookupEmail?: string;
  onUnpaidCancelled?: () => void;
  onBookingRefresh?: () => void;
};

export function ReturnTripGroup({
  legs,
  showActions = false,
  onCancel,
  cancellingId = null,
  lookupEmail,
  onUnpaidCancelled,
  onBookingRefresh,
}: ReturnTripGroupProps) {
  const outbound = legs.find((l) => l.leg === BOOKING_LEG.outbound) ?? legs[0]!;
  const returnLeg = legs.find((l) => l.leg === BOOKING_LEG.return);

  return (
    <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4 shadow-sm sm:p-5">
      <p className="text-sm font-bold text-secondary">Return Trip</p>
      <p className="mt-0.5 text-xs text-content/55">
        Group ref {outbound.group_reference ?? PLACEHOLDER}
      </p>
      <div className="mt-4 space-y-3">
        {legs.map((leg) => {
          const paired =
            leg.leg === BOOKING_LEG.outbound && returnLeg
              ? { reference: returnLeg.reference }
              : leg.leg === BOOKING_LEG.return && outbound
                ? { reference: outbound.reference }
                : null;

          return (
            <BookingCard
              key={leg.id}
              booking={leg}
              pairedLeg={paired}
              compact
              showActions={showActions}
              onCancel={onCancel}
              cancellingId={cancellingId}
              lookupEmail={lookupEmail}
              onUnpaidCancelled={onUnpaidCancelled}
              onBookingRefresh={onBookingRefresh}
            />
          );
        })}
      </div>
    </div>
  );
}
