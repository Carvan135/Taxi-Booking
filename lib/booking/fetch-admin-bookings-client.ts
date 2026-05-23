"use client";

import { createClient } from "@/lib/supabase/client";
import type { AdminBookingRow } from "@/lib/booking/fetch-admin-bookings";

const BOOKING_SELECT = `
  id,
  reference,
  status,
  pickup_address,
  dropoff_address,
  pickup_date,
  pickup_time,
  price,
  platform_commission,
  operator_id,
  customer_id,
  customer_name,
  customer_email,
  created_at,
  completed_at,
  assigned_at,
  operators!bookings_operator_id_fkey ( id, business_name, vehicle_type ),
  profiles!bookings_customer_id_fkey ( full_name, email )
`;

export async function fetchAdminBookingsClient(): Promise<AdminBookingRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as AdminBookingRow[];
}
