import { createClient } from "@/lib/supabase/server";
import type { EmailLog } from "@/types";

export type AdminBookingActor = {
  id: string;
  full_name: string | null;
  email: string;
};

export type AdminBookingDetail = {
  id: string;
  reference: string;
  status: string;
  payment_status: string;
  completion_status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_date: string;
  pickup_time: string;
  price: number | null;
  platform_commission: number;
  operator_payout: number;
  customer_name: string | null;
  customer_email: string;
  customer_phone: string | null;
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
  refund_amount: number | null;
  refund_type: string | null;
  refunded_at: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  dispute_reason: string | null;
  dispute_raised_at: string | null;
  payout_released_at: string | null;
  payout_eligible_at: string | null;
  completed_at: string | null;
  created_at: string;
  operator: { business_name: string; vehicle_type: string } | null;
  customer: { full_name: string | null; email: string } | null;
  refunded_by: AdminBookingActor | null;
  cancelled_by: AdminBookingActor | null;
  email_logs: EmailLog[];
};

export async function fetchAdminBookingDetail(
  bookingId: string,
): Promise<AdminBookingDetail | null> {
  const supabase = createClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      operators!bookings_operator_id_fkey ( business_name, vehicle_type ),
      profiles!bookings_customer_id_fkey ( full_name, email )
    `,
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) return null;

  const actorIds = [
    booking.refunded_by,
    booking.cancelled_by,
  ].filter(Boolean) as string[];

  let actors = new Map<string, AdminBookingActor>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      actors.set(p.id as string, {
        id: p.id as string,
        full_name: p.full_name as string | null,
        email: p.email as string,
      });
    }
  }

  const { data: emailLogs } = await supabase
    .from("email_logs")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(5);

  const op = booking.operators as
    | { business_name: string; vehicle_type: string }
    | { business_name: string; vehicle_type: string }[]
    | null;
  const operator = Array.isArray(op) ? op[0] : op;
  const profile = booking.profiles as
    | { full_name: string | null; email: string }
    | { full_name: string | null; email: string }[]
    | null;
  const customer = Array.isArray(profile) ? profile[0] : profile;

  return {
    id: booking.id as string,
    reference: booking.reference as string,
    status: booking.status as string,
    payment_status: booking.payment_status as string,
    completion_status: booking.completion_status as string,
    pickup_address: booking.pickup_address as string,
    dropoff_address: booking.dropoff_address as string,
    pickup_date: booking.pickup_date as string,
    pickup_time: String(booking.pickup_time),
    price: booking.price != null ? Number(booking.price) : null,
    platform_commission: Number(booking.platform_commission ?? 0),
    operator_payout: Number(booking.operator_payout ?? 0),
    customer_name: booking.customer_name as string | null,
    customer_email: booking.customer_email as string,
    customer_phone: booking.customer_phone as string | null,
    stripe_payment_intent_id: booking.stripe_payment_intent_id as string | null,
    stripe_refund_id: booking.stripe_refund_id as string | null,
    refund_amount:
      booking.refund_amount != null ? Number(booking.refund_amount) : null,
    refund_type: booking.refund_type as string | null,
    refunded_at: booking.refunded_at as string | null,
    cancellation_reason: booking.cancellation_reason as string | null,
    cancelled_at: booking.cancelled_at as string | null,
    dispute_reason: booking.dispute_reason as string | null,
    dispute_raised_at: booking.dispute_raised_at as string | null,
    payout_released_at: booking.payout_released_at as string | null,
    payout_eligible_at: booking.payout_eligible_at as string | null,
    completed_at: booking.completed_at as string | null,
    created_at: booking.created_at as string,
    operator: operator ?? null,
    customer: customer ?? null,
    refunded_by: booking.refunded_by
      ? (actors.get(booking.refunded_by as string) ?? null)
      : null,
    cancelled_by: booking.cancelled_by
      ? (actors.get(booking.cancelled_by as string) ?? null)
      : null,
    email_logs: (emailLogs ?? []) as EmailLog[],
  };
}
