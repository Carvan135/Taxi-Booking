import type Stripe from "stripe";
import type { QuoteRequestTrip } from "@/lib/booking/quote-server";
import { quoteOperatorTrip } from "@/lib/booking/quote-server";
import type { BookingQuote } from "@/lib/booking/quote";
import { getStripeServer } from "@/lib/stripe/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentIntentSetupResult = {
  client_secret: string;
  payment_intent_id: string;
  platform_fee: number;
  operator_payout: number;
  total: number;
  commission_percentage: number;
  stripe_ready: boolean;
  quote: BookingQuote;
  paymentIntent: Stripe.PaymentIntent;
};

export async function createPaymentIntentForTrip(
  supabase: SupabaseClient,
  operatorId: string,
  trip: QuoteRequestTrip,
): Promise<PaymentIntentSetupResult> {
  const { data: operator, error: opError } = await supabase
    .from("operators")
    .select("id, stripe_account_id, stripe_payouts_enabled, status")
    .eq("id", operatorId)
    .maybeSingle();

  if (opError || !operator) {
    throw new Error("Operator not found");
  }

  if (operator.status !== "approved") {
    throw new Error("Operator is not available");
  }

  const quote = await quoteOperatorTrip(operatorId, trip);
  if (!quote) {
    throw new Error("Operator pricing not configured");
  }

  const platform_fee = quote.platform_fee;
  const operator_payout = quote.operator_subtotal;
  const price = quote.total;
  const total_amount_pence = Math.round(price * 100);

  const stripeAccountId = operator.stripe_account_id?.trim() || null;
  const payoutsEnabled = operator.stripe_payouts_enabled === true;

  if (stripeAccountId && !payoutsEnabled) {
    throw new Error("Operator payouts not enabled");
  }

  const stripeReady = Boolean(stripeAccountId && payoutsEnabled);

  const metadata = {
    operator_id: operatorId,
    booking_type: trip.booking_type,
    platform_fee: platform_fee.toString(),
    operator_payout: operator_payout.toString(),
  };

  const stripe = getStripeServer();
  let paymentIntent: Stripe.PaymentIntent;

  if (stripeReady && stripeAccountId) {
    paymentIntent = await stripe.paymentIntents.create({
      amount: total_amount_pence,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      application_fee_amount: Math.round(platform_fee * 100),
      transfer_data: { destination: stripeAccountId },
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

  if (!paymentIntent.client_secret) {
    throw new Error("Failed to create payment intent");
  }

  return {
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id,
    platform_fee,
    operator_payout,
    total: price,
    commission_percentage: quote.platform_fee_percent,
    stripe_ready: stripeReady,
    quote,
    paymentIntent,
  };
}

/** Create PI for an existing unpaid booking total (resume payment). */
export async function createPaymentIntentForBookingTotal(
  supabase: SupabaseClient,
  operatorId: string,
  bookingType: string,
  totalPrice: number,
  platformFee: number,
  operatorPayout: number,
): Promise<PaymentIntentSetupResult> {
  const { data: operator, error: opError } = await supabase
    .from("operators")
    .select("id, stripe_account_id, stripe_payouts_enabled, status")
    .eq("id", operatorId)
    .maybeSingle();

  if (opError || !operator) {
    throw new Error("Operator not found");
  }

  const total_amount_pence = Math.round(totalPrice * 100);
  const stripeAccountId = operator.stripe_account_id?.trim() || null;
  const payoutsEnabled = operator.stripe_payouts_enabled === true;
  const stripeReady = Boolean(stripeAccountId && payoutsEnabled);

  const metadata = {
    operator_id: operatorId,
    booking_type: bookingType,
    platform_fee: platformFee.toString(),
    operator_payout: operatorPayout.toString(),
  };

  const stripe = getStripeServer();
  let paymentIntent: Stripe.PaymentIntent;

  if (stripeReady && stripeAccountId) {
    paymentIntent = await stripe.paymentIntents.create({
      amount: total_amount_pence,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      application_fee_amount: Math.round(platformFee * 100),
      transfer_data: { destination: stripeAccountId },
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

  if (!paymentIntent.client_secret) {
    throw new Error("Failed to create payment intent");
  }

  const quote: BookingQuote = {
    legs: [],
    operator_subtotal: operatorPayout,
    platform_fee: platformFee,
    platform_fee_percent: totalPrice > 0 ? (platformFee / totalPrice) * 100 : 0,
    total: totalPrice,
  };

  return {
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id,
    platform_fee: platformFee,
    operator_payout: operatorPayout,
    total: totalPrice,
    commission_percentage: quote.platform_fee_percent,
    stripe_ready: stripeReady,
    quote,
    paymentIntent,
  };
}
