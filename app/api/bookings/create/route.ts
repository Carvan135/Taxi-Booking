import { NextResponse } from "next/server";
import { createBookingBodySchema } from "@/lib/booking/api-schemas";
import {
  logRouteError,
  userMessageForFinalizeFailure,
  userMessageForInvalidBookingRequest,
  userMessageForPaymentVerifyFailure,
} from "@/lib/api/route-errors";
import { finalizePaidBooking } from "@/lib/booking/finalize-paid-booking";
import { pollPaymentIntentUntilSettled } from "@/lib/booking/poll-payment-intent";
import { getStripeServer } from "@/lib/stripe/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let paymentIntentId: string | undefined;

  try {
    const json: unknown = await req.json();
    const parsed = createBookingBodySchema.safeParse(json);
    if (!parsed.success) {
      logRouteError("bookings/create", parsed.error, {
        reason: "validation_failed",
        details: parsed.error.flatten(),
      });
      return NextResponse.json(
        { error: userMessageForInvalidBookingRequest() },
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
      logRouteError("bookings/create", stripeErr, {
        reason: "stripe_retrieve_failed",
        payment_intent_id: body.payment_intent_id,
      });
      return NextResponse.json(
        { error: userMessageForPaymentVerifyFailure() },
        { status: 400 },
      );
    }

    if (paymentIntent.status === "processing") {
      const settled = await pollPaymentIntentUntilSettled(body.payment_intent_id);
      if (!settled.succeeded) {
        return NextResponse.json(
          {
            error:
              "Payment is still processing. Please wait a moment and try again.",
          },
          { status: 400 },
        );
      }
      paymentIntent = await stripe.paymentIntents.retrieve(
        body.payment_intent_id,
      );
    }

    const supabase = createServiceRoleClient();
    const result = await finalizePaidBooking(supabase, body, paymentIntent);

    if (!result.ok) {
      logRouteError("bookings/create", new Error(result.error), {
        reason: "finalize_failed",
        payment_intent_id: body.payment_intent_id,
        payment_succeeded: result.payment_succeeded,
        status: result.status,
        details: result.details,
      });
      const detailsCode =
        result.details &&
        typeof result.details === "object" &&
        "code" in result.details
          ? String((result.details as { code?: string }).code)
          : undefined;
      return NextResponse.json(
        {
          error: userMessageForFinalizeFailure({
            paymentSucceeded: result.payment_succeeded,
            code: detailsCode,
          }),
          payment_succeeded: result.payment_succeeded,
          booking_reference: result.booking_reference,
          details: result.details,
        },
        { status: result.status },
      );
    }

    return NextResponse.json(result.payload);
  } catch (err) {
    logRouteError("bookings/create", err, {
      reason: "unexpected",
      payment_intent_id: paymentIntentId,
    });
    return NextResponse.json(
      {
        error: userMessageForFinalizeFailure(),
      },
      { status: 500 },
    );
  }
}
