import { NextResponse } from "next/server";
import { createBookingBodySchema } from "@/lib/booking/api-schemas";
import {
  generateBookingReference,
  generateGroupReference,
} from "@/lib/booking/reference";
import {
  BOOKING_STATUS,
  COMPLETION_STATUS,
  PAYMENT_STATUSES,
  type BookingLeg,
  type BookingType,
  type PaymentStatus,
} from "@/lib/validations/enums";
import { getStripeServer } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

type BookingRow = {
  id: string;
  reference: string;
  leg: BookingLeg;
  group_reference: string | null;
};

function successPayload(rows: BookingRow[]) {
  const outbound =
    rows.find((r) => r.leg === LEG_OUTBOUND) ?? rows[0]!;
  return {
    success: true as const,
    booking_reference: outbound.reference,
    ...(outbound.group_reference
      ? { group_reference: outbound.group_reference }
      : {}),
    booking_id: outbound.id,
  };
}

export async function POST(req: Request) {
  let paymentIntentId: string | undefined;
  let validatedBody: unknown;

  try {
    const json: unknown = await req.json();
    validatedBody = json;
    const parsed = createBookingBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    paymentIntentId = body.payment_intent_id;

    const stripe = getStripeServer();
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(
        body.payment_intent_id,
      );
    } catch (stripeErr) {
      console.error("bookings/create stripe retrieve error:", stripeErr);
      return NextResponse.json(
        { error: "Could not verify payment" },
        { status: 400 },
      );
    }

    if (paymentIntent.status === "canceled") {
      return NextResponse.json(
        { error: "Payment was canceled. Please try again." },
        { status: 400 },
      );
    }

    const expectedAmount = Math.round(body.price * 100);
    if (paymentIntent.amount !== expectedAmount) {
      return NextResponse.json(
        { error: "Payment amount mismatch" },
        { status: 400 },
      );
    }

    const metadataOperatorId = paymentIntent.metadata?.operator_id;
    if (metadataOperatorId && metadataOperatorId !== body.operator_id) {
      return NextResponse.json(
        { error: "Operator does not match payment" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    const { data: existingRows, error: existingError } = await supabase
      .from("bookings")
      .select("id, reference, leg, group_reference")
      .eq("stripe_payment_intent_id", body.payment_intent_id)
      .order("created_at", { ascending: true });

    if (existingError) {
      throw existingError;
    }

    if (existingRows && existingRows.length > 0) {
      return NextResponse.json(successPayload(existingRows as BookingRow[]));
    }

    const { data: operator, error: operatorError } = await supabase
      .from("operators")
      .select("id, vehicle_type, status, is_paused")
      .eq("id", body.operator_id)
      .maybeSingle();

    if (operatorError || !operator) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    if (operator.is_paused) {
      return NextResponse.json(
        { error: "Operator is not accepting bookings" },
        { status: 400 },
      );
    }

    const customerId = body.customer_id ?? null;

    const sharedFields = {
      customer_id: customerId,
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
      language: body.language,
      customer_name: body.customer_name,
      customer_email: body.customer_email,
      customer_phone: body.customer_phone,
      assigned_at: null,
      payout_eligible_at: null,
    };

    const insertedRows: BookingRow[] = [];

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

      if (insertError) {
        console.error(
          "bookings/create DB insert failed",
          {
            payment_intent_id: body.payment_intent_id,
            booking_type: body.booking_type,
            insertError,
            body,
          },
        );
        throw insertError;
      }

      insertedRows.push(row as BookingRow);
    } else {
      const groupReference = generateGroupReference();
      const outboundReference = generateBookingReference();
      const returnReference = generateBookingReference();

      const legPrice = splitHalf(body.price);
      const legPlatformFee = splitHalf(body.platform_fee);
      const legOperatorPayout = splitHalf(body.operator_payout);

      const outboundInsert = {
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
      };

      const returnInsert = {
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
      };

      for (const legRow of [outboundInsert, returnInsert]) {
        const { data: row, error: insertError } = await supabase
          .from("bookings")
          .insert(legRow)
          .select("id, reference, leg, group_reference")
          .single();

        if (insertError) {
          console.error(
            "bookings/create DB insert failed",
            {
              payment_intent_id: body.payment_intent_id,
              booking_type: body.booking_type,
              leg: legRow.leg,
              insertError,
              body,
            },
          );
          throw insertError;
        }

        insertedRows.push(row as BookingRow);
      }
    }

    return NextResponse.json(successPayload(insertedRows));
  } catch (err) {
    console.error("bookings/create error:", {
      payment_intent_id: paymentIntentId,
      validatedBody,
      err,
    });
    return NextResponse.json(
      { error: "Failed to save booking. Please contact support with your payment confirmation." },
      { status: 500 },
    );
  }
}
