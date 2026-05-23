import { NextResponse } from "next/server";

import { paymentIntentBodySchema } from "@/lib/booking/api-schemas";

import { quoteOperatorTrip } from "@/lib/booking/quote-server";

import { getStripeServer } from "@/lib/stripe/server";

import { createServiceRoleClient } from "@/lib/supabase/server";



export const dynamic = "force-dynamic";



export async function POST(req: Request) {

  try {

    const json: unknown = await req.json();

    const parsed = paymentIntentBodySchema.safeParse(json);

    if (!parsed.success) {

      return NextResponse.json(

        { error: "Invalid request", details: parsed.error.flatten() },

        { status: 400 },

      );

    }



    const { operator_id, trip } = parsed.data;



    const supabase = createServiceRoleClient();

    const { data: operator, error: opError } = await supabase

      .from("operators")

      .select(

        "id, stripe_account_id, stripe_payouts_enabled, status",

      )

      .eq("id", operator_id)

      .maybeSingle();



    if (opError || !operator) {

      return NextResponse.json({ error: "Operator not found" }, { status: 404 });

    }



    if (operator.status !== "approved") {

      return NextResponse.json(

        { error: "Operator is not available" },

        { status: 400 },

      );

    }



    const quote = await quoteOperatorTrip(operator_id, trip);

    if (!quote) {

      return NextResponse.json(

        { error: "Operator pricing not configured" },

        { status: 404 },

      );

    }



    const platform_fee = quote.platform_fee;

    const operator_payout = quote.operator_subtotal;

    const price = quote.total;

    const total_amount_pence = Math.round(price * 100);



    const stripeAccountId = operator.stripe_account_id?.trim() || null;

    const payoutsEnabled = operator.stripe_payouts_enabled === true;



    if (stripeAccountId && !payoutsEnabled) {

      return NextResponse.json(

        { error: "Operator payouts not enabled" },

        { status: 400 },

      );

    }



    const stripeReady = Boolean(stripeAccountId && payoutsEnabled);



    const metadata = {

      operator_id,

      booking_type: trip.booking_type,

      platform_fee: platform_fee.toString(),

      operator_payout: operator_payout.toString(),

    };



    const stripe = getStripeServer();



    let paymentIntent;

    try {

      if (stripeReady && stripeAccountId) {

        paymentIntent = await stripe.paymentIntents.create({

          amount: total_amount_pence,

          currency: "gbp",

          automatic_payment_methods: { enabled: true },

          application_fee_amount: Math.round(platform_fee * 100),

          transfer_data: {

            destination: stripeAccountId,

          },

          metadata,

        });

      } else {

        paymentIntent = await stripe.paymentIntents.create({

          amount: total_amount_pence,

          currency: "gbp",

          automatic_payment_methods: { enabled: true },

          metadata,

        });

      }

    } catch (stripeErr) {

      console.error("payment-intent stripe error:", stripeErr);

      return NextResponse.json(

        { error: "Unable to set up payment. Please try again." },

        { status: 500 },

      );

    }



    if (!paymentIntent.client_secret) {

      return NextResponse.json(

        { error: "Failed to create payment intent" },

        { status: 500 },

      );

    }



    return NextResponse.json({

      client_secret: paymentIntent.client_secret,

      payment_intent_id: paymentIntent.id,

      platform_fee,

      operator_payout,

      total: price,

      commission_percentage: quote.platform_fee_percent,

      stripe_ready: stripeReady,

      quote,

    });

  } catch (err) {

    console.error("payment-intent error:", err);

    return NextResponse.json(

      { error: "Unable to set up payment. Please try again." },

      { status: 500 },

    );

  }

}


