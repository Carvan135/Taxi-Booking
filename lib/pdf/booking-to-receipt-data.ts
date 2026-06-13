import type { MappedBookingEmailData } from "@/lib/email/map-booking-email-data";
import type { BookingEmailReturnLeg } from "@/lib/email/types";
import { getAppUrl } from "@/lib/env/app-url";
import type { Booking } from "@/types";

export type ReceiptLegRow = Pick<
  Booking,
  | "leg"
  | "pickup_address"
  | "dropoff_address"
  | "pickup_date"
  | "pickup_time"
  | "passengers"
  | "service_type"
  | "price"
  | "platform_commission"
  | "reference"
>;

export type ReceiptBooking = Booking & {
  operators?: {
    business_name: string;
    vehicle_type: string | null;
  } | null;
  grouped_legs?: ReceiptLegRow[];
};

export function bookingToReceiptEmailData(
  booking: ReceiptBooking,
): MappedBookingEmailData & BookingEmailReturnLeg {
  const legs = booking.grouped_legs ?? [booking];
  const outbound =
    legs.find((l) => l.leg === "outbound") ?? legs[0];
  const returnLeg = legs.find((l) => l.leg === "return");
  const appUrl = getAppUrl().replace(/\/$/, "");

  const totalPrice = legs.reduce(
    (sum, leg) => sum + Number(leg.price ?? 0),
    0,
  );
  const totalCommission = legs.reduce(
    (sum, leg) => sum + Number(leg.platform_commission ?? 0),
    0,
  );

  const operatorName =
    booking.operators?.business_name?.trim() || "Assigned operator";
  const vehicleType =
    booking.operators?.vehicle_type?.trim() ||
    booking.vehicle_type?.trim() ||
    "—";

  const bookingType =
    booking.booking_type === "return" ? "return" : "one_way";

  return {
    reference: booking.reference,
    customer_name: booking.customer_name?.trim() || "Guest",
    customer_email: booking.customer_email,
    pickup_address: outbound.pickup_address,
    dropoff_address: outbound.dropoff_address,
    pickup_date: outbound.pickup_date,
    pickup_time: outbound.pickup_time,
    service_type: outbound.service_type,
    passengers: outbound.passengers,
    operator_name: operatorName,
    vehicle_type: vehicleType,
    price: Math.round(totalPrice * 100) / 100,
    platform_commission: Math.round(totalCommission * 100) / 100,
    booking_type: bookingType,
    return_date: returnLeg?.pickup_date ?? booking.return_date ?? undefined,
    return_time: returnLeg?.pickup_time ?? booking.return_time ?? undefined,
    return_pickup_address: returnLeg?.pickup_address,
    return_dropoff_address: returnLeg?.dropoff_address,
    app_url: appUrl,
  };
}
