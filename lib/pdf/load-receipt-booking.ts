import { mapOperatorJoin } from "@/lib/booking/map-customer-booking-row";
import { OPERATOR_FOR_CUSTOMER_BOOKING_SELECT } from "@/lib/booking/operator-booking-select";
import type { ReceiptBooking, ReceiptLegRow } from "@/lib/pdf/booking-to-receipt-data";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Booking } from "@/types";

const receiptBookingSelect = `
  *,
  operators (
    ${OPERATOR_FOR_CUSTOMER_BOOKING_SELECT}
  )
`;

export async function loadReceiptBookingById(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<ReceiptBooking | null> {
  const { data: primary, error } = await supabase
    .from("bookings")
    .select(receiptBookingSelect)
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !primary) return null;

  let legRows = [primary];
  if (primary.group_reference) {
    const { data: grouped } = await supabase
      .from("bookings")
      .select(receiptBookingSelect)
      .eq("group_reference", primary.group_reference)
      .order("leg", { ascending: true });
    if (grouped?.length) legRows = grouped;
  }

  const operator = mapOperatorJoin(
    primary.operators as Parameters<typeof mapOperatorJoin>[0],
  );

  const grouped_legs: ReceiptLegRow[] = legRows.map((row) => ({
    leg: row.leg as Booking["leg"],
    pickup_address: row.pickup_address,
    dropoff_address: row.dropoff_address,
    pickup_date: row.pickup_date,
    pickup_time: row.pickup_time,
    passengers: row.passengers,
    service_type: row.service_type,
    price: row.price,
    platform_commission: row.platform_commission,
    reference: row.reference,
  }));

  return {
    ...(primary as Booking),
    operators: operator
      ? {
          business_name: operator.business_name,
          vehicle_type: operator.vehicle_type,
        }
      : null,
    grouped_legs,
  };
}
