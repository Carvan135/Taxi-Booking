import { NextResponse } from "next/server";
import { createBookingBodySchema } from "@/lib/booking/api-schemas";
import {
  insertPendingBookings,
  pendingBookingSuccessPayload,
} from "@/lib/booking/insert-pending-bookings";
import { getOperatorPaymentEligibility } from "@/lib/booking/operator-payment-eligibility";
import {
  isPaymentIntentReusable,
  paymentIntentAmountMatches,
} from "@/lib/stripe/payment-intent-utils";
import { getStripeServer } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Creates or updates pending unpaid bookings before payment completes. */
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
    const supabase = createServiceRoleClient();

    try {
      await getOperatorPaymentEligibility(supabase, body.operator_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Operator unavailable";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const stripe = getStripeServer();
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(
        body.payment_intent_id,
      );
    } catch {
      return NextResponse.json(
        { error: "Could not verify payment session" },
        { status: 400 },
      );
    }

    if (paymentIntent.status === "canceled") {
      return NextResponse.json(
        { error: "Payment session expired. Please refresh the page." },
        { status: 400 },
      );
    }

    if (
      paymentIntent.status === "succeeded" ||
      paymentIntent.status === "processing"
    ) {
      return NextResponse.json(
        { error: "Payment already in progress. Please wait or refresh." },
        { status: 400 },
      );
    }

    if (!isPaymentIntentReusable(paymentIntent.status)) {
      return NextResponse.json(
        { error: "Payment session is no longer valid. Please refresh the page." },
        { status: 400 },
      );
    }

    if (!paymentIntentAmountMatches(paymentIntent, body.price)) {
      return NextResponse.json(
        {
          error: "Price has changed. Please refresh the page to get an updated total.",
          details: { code: "amount_mismatch" },
        },
        { status: 400 },
      );
    }

    const rows = await insertPendingBookings(supabase, body);

    return NextResponse.json(pendingBookingSuccessPayload(rows));
  } catch (err) {
    console.error("bookings/draft error:", err);
    const message =
      err instanceof Error ? err.message : "Could not save booking draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
