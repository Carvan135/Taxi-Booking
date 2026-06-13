import type { BookingEmailSnapshot } from "@/lib/email/booking-context";
import type {
  BookingEmailData,
  BookingEmailReturnLeg,
} from "@/lib/email/types";
import { getAppUrl } from "@/lib/env/app-url";

export type MappedBookingEmailData = BookingEmailData & BookingEmailReturnLeg;

export function snapshotToBookingEmailData(
  snapshot: BookingEmailSnapshot,
): MappedBookingEmailData {
  const outbound =
    snapshot.legs.find((l) => l.leg === "outbound") ?? snapshot.legs[0];
  const returnLeg = snapshot.legs.find((l) => l.leg === "return");
  const appUrl = getAppUrl().replace(/\/$/, "");

  if (!outbound) {
    throw new Error("Booking email snapshot has no legs");
  }

  const platformCommission = snapshot.legs.reduce(
    (sum, leg) => sum + Number(leg.platform_commission ?? 0),
    0,
  );

  const bookingType =
    snapshot.booking_type === "return" ? "return" : "one_way";

  return {
    reference: snapshot.reference,
    customer_name: snapshot.customer_name?.trim() || "Guest",
    customer_email: snapshot.customer_email,
    pickup_address: outbound.pickup_address,
    dropoff_address: outbound.dropoff_address,
    pickup_date: outbound.pickup_date,
    pickup_time: outbound.pickup_time,
    service_type: outbound.service_type,
    passengers: outbound.passengers,
    operator_name: outbound.operator_name ?? "Assigned operator",
    vehicle_type: outbound.vehicle_type ?? "—",
    price: snapshot.total_paid,
    platform_commission: Math.round(platformCommission * 100) / 100,
    booking_type: bookingType,
    return_date: returnLeg?.pickup_date,
    return_time: returnLeg?.pickup_time,
    return_pickup_address: returnLeg?.pickup_address,
    return_dropoff_address: returnLeg?.dropoff_address,
    app_url: appUrl,
  };
}

export function legToBookingEmailData(
  snapshot: BookingEmailSnapshot,
  legReference: string,
): MappedBookingEmailData {
  const leg = snapshot.legs.find((l) => l.reference === legReference);
  if (!leg) return snapshotToBookingEmailData(snapshot);

  const base = snapshotToBookingEmailData(snapshot);
  return {
    ...base,
    reference: leg.reference,
    pickup_address: leg.pickup_address,
    dropoff_address: leg.dropoff_address,
    pickup_date: leg.pickup_date,
    pickup_time: leg.pickup_time,
    service_type: leg.service_type,
    passengers: leg.passengers,
    operator_name: leg.operator_name ?? base.operator_name,
    vehicle_type: leg.vehicle_type ?? base.vehicle_type,
    price: leg.price,
    platform_commission: Number(leg.platform_commission ?? 0),
    booking_type: "one_way",
    return_date: undefined,
    return_time: undefined,
    return_pickup_address: undefined,
    return_dropoff_address: undefined,
  };
}
