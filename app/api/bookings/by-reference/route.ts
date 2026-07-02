import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyBookingReferenceAccess } from "@/lib/booking/guest-booking-access";
import { mapOperatorJoin } from "@/lib/booking/map-customer-booking-row";
import { OPERATOR_FOR_CUSTOMER_BOOKING_SELECT } from "@/lib/booking/operator-booking-select";
import { reconcilePaymentIntentById } from "@/lib/stripe/reconcile-payment-intent";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  ref: z.string().min(1),
  email: z.string().email().optional(),
});

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
  return_date,
  return_time,
  passengers,
  service_type,
  price,
  status,
  payment_status,
  stripe_payment_intent_id,
  operator_id,
  created_at,
  customer_id,
  customer_email,
  customer_name,
  customer_phone,
  journey_started_at,
  completion_status,
  completion_requested_at,
  completion_requested_by,
  customer_confirmed_at,
  auto_complete_at,
  dispute_raised_at,
  dispute_reason,
  completed_at,
  notes,
  luggage,
  return_date,
  return_time,
  booking_reviews (
    id,
    rating,
    comment,
    created_at
  ),
  operators (
    ${OPERATOR_FOR_CUSTOMER_BOOKING_SELECT}
  )
`;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      ref: url.searchParams.get("ref")?.trim() ?? "",
      email: url.searchParams.get("email")?.trim() || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
    }

    const { ref, email } = parsed.data;
    const supabase = createServiceRoleClient();

    const { data: primary, error: primaryError } = await supabase
      .from("bookings")
      .select(bookingSelect)
      .eq("reference", ref)
      .maybeSingle();

    if (primaryError) {
      throw primaryError;
    }

    if (!primary) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (
      primary.payment_status !== "paid" &&
      primary.stripe_payment_intent_id?.trim()
    ) {
      const reconciled = await reconcilePaymentIntentById(
        supabase,
        primary.stripe_payment_intent_id.trim(),
        { sendNotifications: true },
      );
      if (reconciled.error) {
        console.error(
          "bookings/by-reference reconcile error:",
          reconciled.error,
        );
      }
    }

    const { data: refreshed, error: refreshError } = await supabase
      .from("bookings")
      .select(bookingSelect)
      .eq("reference", ref)
      .maybeSingle();

    if (refreshError) throw refreshError;
    const row = refreshed ?? primary;

    const authClient = createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const access = verifyBookingReferenceAccess(row, {
      userId: user?.id ?? null,
      email,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let legs = [row];

    if (row.group_reference) {
      const { data: grouped, error: groupError } = await supabase
        .from("bookings")
        .select(bookingSelect)
        .eq("group_reference", row.group_reference)
        .order("leg", { ascending: true });

      if (groupError) {
        throw groupError;
      }
      if (grouped && grouped.length > 0) {
        legs = grouped;
      }
    }

    const total_paid = legs.reduce(
      (sum, legRow) => sum + (Number(legRow.price) || 0),
      0,
    );

    const operator = mapOperatorJoin(
      row.operators as Parameters<typeof mapOperatorJoin>[0],
    );

    return NextResponse.json({
      reference: row.reference,
      group_reference: row.group_reference,
      booking_type: row.booking_type,
      total_paid: Math.round(total_paid * 100) / 100,
      customer_email: row.customer_email,
      customer_name: row.customer_name,
      is_guest: row.customer_id === null,
      operator,
      legs: legs.map((legRow) => {
        const legOperator = mapOperatorJoin(
          legRow.operators as Parameters<typeof mapOperatorJoin>[0],
        );
        return {
          id: legRow.id,
          reference: legRow.reference,
          leg: legRow.leg,
          pickup_address: legRow.pickup_address,
          dropoff_address: legRow.dropoff_address,
          pickup_date: legRow.pickup_date,
          pickup_time: legRow.pickup_time,
          return_date: legRow.return_date,
          return_time: legRow.return_time,
          passengers: legRow.passengers,
          service_type: legRow.service_type,
          price: legRow.price,
          status: legRow.status,
          payment_status: legRow.payment_status,
          operator_id: legRow.operator_id,
          created_at: legRow.created_at,
          booking_type: legRow.booking_type,
          group_reference: legRow.group_reference,
          notes: legRow.notes,
          luggage: legRow.luggage,
          journey_started_at: legRow.journey_started_at,
          completion_status: legRow.completion_status,
          completion_requested_at: legRow.completion_requested_at,
          completion_requested_by: legRow.completion_requested_by,
          customer_confirmed_at: legRow.customer_confirmed_at,
          auto_complete_at: legRow.auto_complete_at,
          dispute_raised_at: legRow.dispute_raised_at,
          dispute_reason: legRow.dispute_reason,
          completed_at: legRow.completed_at,
          review: legRow.booking_reviews,
          operator: legOperator,
        };
      }),
    });
  } catch (err) {
    console.error("bookings/by-reference error:", err);
    return NextResponse.json(
      { error: "Could not load booking" },
      { status: 500 },
    );
  }
}
