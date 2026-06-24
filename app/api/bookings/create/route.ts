import { NextResponse } from "next/server";
import { createBookingBodySchema } from "@/lib/booking/api-schemas";
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
      return NextResponse.json(
        {
          error: result.error,
          payment_succeeded: result.payment_succeeded,
          booking_reference: result.booking_reference,
          details: result.details,
        },
        { status: result.status },
      );
    }

    return NextResponse.json(result.payload);
  } catch (err) {
    console.error("bookings/create error:", {
      payment_intent_id: paymentIntentId,
      err,
    });
    return NextResponse.json(
      {
        error:
          "Failed to save booking. Please contact support with your payment confirmation.",
      },
      { status: 500 },
    );
  }
}
