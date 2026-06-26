import type { SupabaseClient } from "@supabase/supabase-js";
import { mapOperatorJoin } from "@/lib/booking/map-customer-booking-row";
import { OPERATOR_FOR_CUSTOMER_BOOKING_SELECT } from "@/lib/booking/operator-booking-select";
import { getAppUrl } from "@/lib/env/app-url";

const bookingSelect = `
  id,
  reference,
  group_reference,
  leg,
  booking_type,
  pickup_address,
  dropoff_address,
  pickup_date,
  pickup_time,
  passengers,
  service_type,
  price,
  platform_commission,
  return_date,
  return_time,
  status,
  payment_status,
  customer_email,
  customer_name,
  customer_phone,
  operators (
    ${OPERATOR_FOR_CUSTOMER_BOOKING_SELECT}
  )
`;

export type BookingEmailLeg = {
  reference: string;
  leg: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_date: string;
  pickup_time: string;
  passengers: number;
  service_type: string;
  price: number;
  platform_commission: number;
  operator_name: string | null;
  vehicle_type: string | null;
};

export type BookingEmailSnapshot = {
  reference: string;
  group_reference: string | null;
  booking_type: string;
  customer_email: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_paid: number;
  legs: BookingEmailLeg[];
  booking_id: string;
  lookup_url: string;
  receipt_url: string;
};

function mapLeg(row: Record<string, unknown>): BookingEmailLeg {
  const op = mapOperatorJoin(
    row.operators as Parameters<typeof mapOperatorJoin>[0],
  );
  return {
    reference: String(row.reference),
    leg: String(row.leg ?? "outbound"),
    pickup_address: String(row.pickup_address),
    dropoff_address: String(row.dropoff_address),
    pickup_date: String(row.pickup_date),
    pickup_time: String(row.pickup_time),
    passengers: Number(row.passengers ?? 1),
    service_type: String(row.service_type ?? "Saloon"),
    price: Number(row.price ?? 0),
    platform_commission: Number(row.platform_commission ?? 0),
    operator_name: op?.business_name ?? null,
    vehicle_type: op?.vehicle_type ?? null,
  };
}

function buildUrls(reference: string, email: string, bookingId: string) {
  const appUrl = getAppUrl();
  const lookupParams = new URLSearchParams({ ref: reference, email });
  const receiptParams = new URLSearchParams({ email });
  return {
    lookup_url: `${appUrl}/bookings/lookup?${lookupParams.toString()}`,
    receipt_url: `${appUrl}/api/bookings/${bookingId}/receipt?${receiptParams.toString()}`,
  };
}

export async function loadBookingEmailSnapshotByReference(
  supabase: SupabaseClient,
  reference: string,
): Promise<BookingEmailSnapshot | null> {
  const { data: primary, error } = await supabase
    .from("bookings")
    .select(bookingSelect)
    .eq("reference", reference)
    .maybeSingle();

  if (error || !primary) return null;

  let rows = [primary];
  if (primary.group_reference) {
    const { data: grouped } = await supabase
      .from("bookings")
      .select(bookingSelect)
      .eq("group_reference", primary.group_reference)
      .order("leg", { ascending: true });
    if (grouped?.length) rows = grouped;
  }

  const legs = rows.map((r) => mapLeg(r as Record<string, unknown>));
  const total_paid = legs.reduce((sum, l) => sum + l.price, 0);
  const email = String(primary.customer_email ?? "").trim();
  const bookingId = String(primary.id);
  const urls = buildUrls(String(primary.reference), email, bookingId);

  return {
    booking_id: bookingId,
    reference: String(primary.reference),
    group_reference: primary.group_reference as string | null,
    booking_type: String(primary.booking_type),
    customer_email: email,
    customer_name: (primary.customer_name as string | null) ?? null,
    customer_phone: (primary.customer_phone as string | null) ?? null,
    total_paid: Math.round(total_paid * 100) / 100,
    legs,
    ...urls,
  };
}

export async function loadBookingEmailSnapshotsForPaymentIntent(
  supabase: SupabaseClient,
  paymentIntentId: string,
): Promise<BookingEmailSnapshot[]> {
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("reference")
    .eq("stripe_payment_intent_id", paymentIntentId);

  if (error || !bookings?.length) return [];

  const refs = Array.from(new Set(bookings.map((b) => b.reference as string)));
  const snapshots: BookingEmailSnapshot[] = [];
  for (const ref of refs) {
    const snap = await loadBookingEmailSnapshotByReference(supabase, ref);
    if (snap) snapshots.push(snap);
  }
  return snapshots;
}

export async function resolveProfileEmail(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  const email = data?.email?.trim();
  return email || null;
}
