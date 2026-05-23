import { NextResponse } from "next/server";
import { finalizePaidBooking } from "@/lib/booking/finalize-paid-booking";
import { createBookingBodySchema } from "@/lib/booking/api-schemas";
import {
  isPaymentIntentReusable,
  isPaymentIntentSucceededOrProcessing,
} from "@/lib/stripe/payment-intent-utils";
import { getStripeServer } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Poll payment state; optionally finalize booking when PI already succeeded (3DS return). */
export async function GET(req: Request) {
  const paymentIntentId = new URL(req.url).searchParams
    .get("payment_intent_id")
    ?.trim();

  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "payment_intent_id is required" },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripeServer();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return NextResponse.json({
      status: intent.status,
      reusable: isPaymentIntentReusable(intent.status),
      can_finalize: isPaymentIntentSucceededOrProcessing(intent.status),
      amount: intent.amount / 100,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load payment status" },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = createBookingBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const stripe = getStripeServer();
    const intent = await stripe.paymentIntents.retrieve(body.payment_intent_id);

    if (!isPaymentIntentSucceededOrProcessing(intent.status)) {
      return NextResponse.json(
        {
          finalized: false,
          status: intent.status,
          error: "Payment has not completed yet",
        },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();
    const result = await finalizePaidBooking(supabase, body, intent);

    if (!result.ok) {
      return NextResponse.json(
        {
          finalized: false,
          error: result.error,
          payment_succeeded: result.payment_succeeded,
          booking_reference: result.booking_reference,
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      finalized: true,
      ...result.payload,
    });
  } catch (err) {
    console.error("payment-intent/status POST:", err);
    return NextResponse.json(
      { error: "Could not finalize booking" },
      { status: 500 },
    );
  }
}
