import {
  mapCustomerBookingRow,
  type BookingRowWithOperator,
} from "@/lib/booking/map-customer-booking-row";
import { CUSTOMER_BOOKING_LIST_SELECT } from "@/lib/booking/customer-booking-select";
import { createClient } from "@/lib/supabase/server";
import type { CustomerBookingRow } from "@/types";

export async function fetchCustomerBookings(): Promise<CustomerBookingRow[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("bookings")
    .select(CUSTOMER_BOOKING_LIST_SELECT)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    mapCustomerBookingRow(row as BookingRowWithOperator),
  );
}
