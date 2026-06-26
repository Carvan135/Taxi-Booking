import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateBookingReference,
  generateGroupReference,
} from "@/lib/booking/reference";
import { getOperatorPaymentEligibility } from "@/lib/booking/operator-payment-eligibility";
import {
  BOOKING_STATUS,
  COMPLETION_STATUS,
  PAYMENT_STATUSES,
  type BookingLeg,
  type BookingType,
  type PaymentStatus,
} from "@/lib/validations/enums";
import type { createBookingBodySchema } from "@/lib/booking/api-schemas";
import type { z } from "zod";

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;

const PAYMENT_UNPAID = PAYMENT_STATUSES[0] satisfies PaymentStatus;
const LEG_OUTBOUND = "outbound" satisfies BookingLeg;
const LEG_RETURN = "return" satisfies BookingLeg;
const TYPE_ONE_WAY = "one_way" satisfies BookingType;
const TYPE_RETURN = "return" satisfies BookingType;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function splitHalf(value: number): number {
  return roundMoney(value / 2);
}

export type PendingBookingRow = {
  id: string;
  reference: string;
  leg: BookingLeg;
  group_reference: string | null;
};

export function pendingBookingSuccessPayload(rows: PendingBookingRow[]) {
  const outbound = rows.find((r) => r.leg === LEG_OUTBOUND) ?? rows[0]!;
  return {
    success: true as const,
    booking_reference: outbound.reference,
    ...(outbound.group_reference
      ? { group_reference: outbound.group_reference }
      : {}),
    booking_id: outbound.id,
    booking_ids: rows.map((r) => r.id),
  };
}

export async function findBookingsByPaymentIntent(
  supabase: SupabaseClient,
  paymentIntentId: string,
): Promise<PendingBookingRow[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, reference, leg, group_reference")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PendingBookingRow[];
}

function pendingTripUpdateFields(body: CreateBookingBody) {
  return {
    operator_id: body.operator_id,
    passengers: body.passengers,
    service_type: body.service_type,
    luggage: body.luggage,
    notes: body.notes?.trim() || null,
    pickup_address: body.pickup_address,
    dropoff_address: body.dropoff_address,
    pickup_date: body.pickup_date,
    pickup_time: body.pickup_time,
    return_date: body.return_date ?? null,
    return_time: body.return_time ?? null,
    price: body.price,
    platform_commission: body.platform_fee,
    operator_payout: body.operator_payout,
    updated_at: new Date().toISOString(),
  };
}

export async function insertPendingBookings(
  supabase: SupabaseClient,
  body: CreateBookingBody,
): Promise<PendingBookingRow[]> {
  const operator = await getOperatorPaymentEligibility(supabase, body.operator_id);

  const existing = await findBookingsByPaymentIntent(
    supabase,
    body.payment_intent_id,
  );

  if (existing.length > 0) {
    const customerFields = {
      customer_name: body.customer_name,
      customer_email: body.customer_email,
      customer_phone: body.customer_phone,
      customer_id: body.customer_id ?? null,
      vehicle_type: operator.vehicle_type,
      passengers: body.passengers,
      service_type: body.service_type,
      luggage: body.luggage,
      notes: body.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (existing.length === 1) {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          ...customerFields,
          ...pendingTripUpdateFields(body),
        })
        .eq("stripe_payment_intent_id", body.payment_intent_id)
        .eq("status", BOOKING_STATUS.pending);

      if (updateError) throw updateError;
    } else {
      const legPrice = splitHalf(body.price);
      const legPlatformFee = splitHalf(body.platform_fee);
      const legOperatorPayout = splitHalf(body.operator_payout);

      const { error: customerUpdateError } = await supabase
        .from("bookings")
        .update(customerFields)
        .eq("stripe_payment_intent_id", body.payment_intent_id)
        .eq("status", BOOKING_STATUS.pending);

      if (customerUpdateError) throw customerUpdateError;

      const { error: outboundError } = await supabase
        .from("bookings")
        .update({
          pickup_address: body.pickup_address,
          dropoff_address: body.dropoff_address,
          pickup_date: body.pickup_date,
          pickup_time: body.pickup_time,
          return_date: body.return_date ?? null,
          return_time: body.return_time ?? null,
          price: legPrice,
          platform_commission: legPlatformFee,
          operator_payout: legOperatorPayout,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_payment_intent_id", body.payment_intent_id)
        .eq("leg", LEG_OUTBOUND)
        .eq("status", BOOKING_STATUS.pending);

      if (outboundError) throw outboundError;

      const { error: returnError } = await supabase
        .from("bookings")
        .update({
          pickup_address: body.dropoff_address,
          dropoff_address: body.pickup_address,
          pickup_date: body.return_date!,
          pickup_time: body.return_time!,
          return_date: body.return_date ?? null,
          return_time: body.return_time ?? null,
          price: legPrice,
          platform_commission: legPlatformFee,
          operator_payout: legOperatorPayout,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_payment_intent_id", body.payment_intent_id)
        .eq("leg", LEG_RETURN)
        .eq("status", BOOKING_STATUS.pending);

      if (returnError) throw returnError;
    }

    return existing;
  }

  const sharedFields = {
    customer_id: body.customer_id ?? null,
    operator_id: body.operator_id,
    passengers: body.passengers,
    vehicle_type: operator.vehicle_type,
    status: BOOKING_STATUS.pending,
    stripe_payment_intent_id: body.payment_intent_id,
    payment_status: PAYMENT_UNPAID,
    stripe_payment_status: PAYMENT_UNPAID,
    completion_status: COMPLETION_STATUS.none,
    notes: body.notes?.trim() || null,
    service_type: body.service_type,
    luggage: body.luggage,
    customer_name: body.customer_name,
    customer_email: body.customer_email,
    customer_phone: body.customer_phone,
    assigned_at: null,
    payout_eligible_at: null,
  };

  const insertedRows: PendingBookingRow[] = [];

  if (body.booking_type === TYPE_ONE_WAY) {
    const reference = generateBookingReference();
    const { data: row, error: insertError } = await supabase
      .from("bookings")
      .insert({
        ...sharedFields,
        reference,
        booking_type: TYPE_ONE_WAY,
        leg: LEG_OUTBOUND,
        group_reference: null,
        pickup_address: body.pickup_address,
        dropoff_address: body.dropoff_address,
        pickup_date: body.pickup_date,
        pickup_time: body.pickup_time,
        return_date: null,
        return_time: null,
        price: body.price,
        platform_commission: body.platform_fee,
        operator_payout: body.operator_payout,
      })
      .select("id, reference, leg, group_reference")
      .single();

    if (insertError) throw insertError;
    insertedRows.push(row as PendingBookingRow);
  } else {
    const groupReference = generateGroupReference();
    const outboundReference = generateBookingReference();
    const returnReference = generateBookingReference();
    const legPrice = splitHalf(body.price);
    const legPlatformFee = splitHalf(body.platform_fee);
    const legOperatorPayout = splitHalf(body.operator_payout);

    const legs = [
      {
        ...sharedFields,
        reference: outboundReference,
        booking_type: TYPE_RETURN,
        leg: LEG_OUTBOUND,
        group_reference: groupReference,
        pickup_address: body.pickup_address,
        dropoff_address: body.dropoff_address,
        pickup_date: body.pickup_date,
        pickup_time: body.pickup_time,
        return_date: body.return_date!,
        return_time: body.return_time!,
        price: legPrice,
        platform_commission: legPlatformFee,
        operator_payout: legOperatorPayout,
      },
      {
        ...sharedFields,
        reference: returnReference,
        booking_type: TYPE_RETURN,
        leg: LEG_RETURN,
        group_reference: groupReference,
        pickup_address: body.dropoff_address,
        dropoff_address: body.pickup_address,
        pickup_date: body.return_date!,
        pickup_time: body.return_time!,
        return_date: body.return_date!,
        return_time: body.return_time!,
        price: legPrice,
        platform_commission: legPlatformFee,
        operator_payout: legOperatorPayout,
      },
    ];

    for (const legRow of legs) {
      const { data: row, error: insertError } = await supabase
        .from("bookings")
        .insert(legRow)
        .select("id, reference, leg, group_reference")
        .single();

      if (insertError) {
        if (insertedRows.length > 0) {
          await supabase
            .from("bookings")
            .delete()
            .in(
              "id",
              insertedRows.map((r) => r.id),
            );
        }
        throw insertError;
      }
      insertedRows.push(row as PendingBookingRow);
    }
  }

  return insertedRows;
}
