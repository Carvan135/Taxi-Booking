import type { Booking } from "@/types";
import type { CreateBookingBody } from "@/lib/booking/insert-pending-bookings";

export function buildCreateBodyFromBooking(
  booking: Booking,
  paymentIntentId: string,
  totals: {
    price: number;
    platform_fee: number;
    operator_payout: number;
  },
  customerEmail?: string,
): CreateBookingBody {
  return {
    payment_intent_id: paymentIntentId,
    operator_id: booking.operator_id!,
    customer_name: booking.customer_name ?? "Customer",
    customer_email: customerEmail?.trim() || booking.customer_email,
    customer_phone: booking.customer_phone ?? "",
    booking_type: booking.booking_type,
    pickup_address: booking.pickup_address,
    dropoff_address: booking.dropoff_address,
    pickup_date: booking.pickup_date,
    pickup_time: booking.pickup_time,
    return_date: booking.return_date ?? undefined,
    return_time: booking.return_time ?? undefined,
    passengers: booking.passengers,
    service_type: booking.service_type,
    luggage: booking.luggage ?? 0,
    price: totals.price,
    platform_fee: totals.platform_fee,
    operator_payout: totals.operator_payout,
    notes: booking.notes ?? undefined,
    customer_id: booking.customer_id,
  };
}
