import { NextResponse } from "next/server";
import { createBookingBodySchema } from "@/lib/booking/api-schemas";
import {
  insertPendingBookings,
  pendingBookingSuccessPayload,
} from "@/lib/booking/insert-pending-bookings";
import { getOperatorPaymentEligibility } from "@/lib/booking/operator-payment-eligibility";
import {
  isPaymentIntentReusable,
  isPaymentIntentSucceededOrProcessing,
  paymentIntentAmountMatches,
} from "@/lib/stripe/payment-intent-utils";
import { syncBookingsFromPaymentIntent } from "@/lib/stripe/sync-booking-payment";
import { getStripeServer } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  logRouteError,
  userMessageForDraftFailure,
  userMessageForDraftUnavailable,
  userMessageForInvalidBookingRequest,
  userMessageForOperatorError,
  userMessageForPaymentSessionError,
  userMessageForPaymentVerifyFailure,
} from "@/lib/api/route-errors";

export const dynamic = "force-dynamic";

/** Creates or updates pending unpaid bookings before payment completes. */
export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = createBookingBodySchema.safeParse(json);
    if (!parsed.success) {
      logRouteError("bookings/draft", parsed.error, {
        reason: "validation_failed",
        details: parsed.error.flatten(),
      });
      return NextResponse.json(
        { error: userMessageForInvalidBookingRequest() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    let supabase;
    try {
      supabase = createServiceRoleClient();
    } catch (e) {
      logRouteError("bookings/draft", e, { reason: "service_role_unavailable" });
      return NextResponse.json(
        { error: userMessageForDraftUnavailable() },
        { status: 503 },
      );
    }

    try {
      await getOperatorPaymentEligibility(supabase, body.operator_id);
    } catch (e) {
      const operatorMessage =
        e instanceof Error ? e.message : "Operator unavailable";
      logRouteError("bookings/draft", e, {
        reason: "operator_unavailable",
        operator_id: body.operator_id,
      });
      return NextResponse.json(
        { error: userMessageForOperatorError(operatorMessage) },
        { status: 400 },
      );
    }

    const stripe = getStripeServer();
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(
        body.payment_intent_id,
      );
    } catch (stripeErr) {
      logRouteError("bookings/draft", stripeErr, {
        reason: "stripe_retrieve_failed",
        payment_intent_id: body.payment_intent_id,
      });
      return NextResponse.json(
        { error: userMessageForPaymentVerifyFailure() },
        { status: 400 },
      );
    }

    if (paymentIntent.status === "canceled") {
      return NextResponse.json(
        { error: userMessageForPaymentSessionError("expired") },
        { status: 400 },
      );
    }

    if (!paymentIntentAmountMatches(paymentIntent, body.price)) {
      logRouteError("bookings/draft", new Error("payment_intent_amount_mismatch"), {
        reason: "amount_mismatch",
        payment_intent_id: body.payment_intent_id,
        client_price: body.price,
        stripe_amount: paymentIntent.amount,
      });
      return NextResponse.json(
        {
          error: userMessageForDraftFailure({ code: "amount_mismatch" }),
          details: { code: "amount_mismatch" },
        },
        { status: 400 },
      );
    }

    const paymentAlreadyComplete = isPaymentIntentSucceededOrProcessing(
      paymentIntent.status,
    );

    if (!paymentAlreadyComplete && !isPaymentIntentReusable(paymentIntent.status)) {
      logRouteError("bookings/draft", new Error("payment_intent_not_reusable"), {
        reason: "payment_intent_not_reusable",
        payment_intent_id: body.payment_intent_id,
        stripe_status: paymentIntent.status,
      });
      return NextResponse.json(
        { error: userMessageForPaymentSessionError("invalid") },
        { status: 400 },
      );
    }

    const rows = await insertPendingBookings(supabase, body);

    if (paymentAlreadyComplete) {
      await syncBookingsFromPaymentIntent(supabase, paymentIntent, {
        sendNotifications: false,
      });
    }

    return NextResponse.json({
      ...pendingBookingSuccessPayload(rows),
      payment_already_complete: paymentAlreadyComplete,
    });
  } catch (err) {
    logRouteError("bookings/draft", err, { reason: "unexpected" });
    return NextResponse.json(
      { error: userMessageForDraftFailure() },
      { status: 500 },
    );
  }
}
