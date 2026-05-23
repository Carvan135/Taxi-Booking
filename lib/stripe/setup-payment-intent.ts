import type { QuoteRequestTrip } from "@/lib/booking/quote-server";
import { cancelPendingBookingsForPaymentIntent } from "@/lib/booking/cancel-stale-pending";
import { getOperatorPaymentEligibility } from "@/lib/booking/operator-payment-eligibility";
import { createPaymentIntentForTrip } from "@/lib/stripe/create-payment-intent";
import {
  isPaymentIntentReusable,
  paymentIntentAmountMatches,
} from "@/lib/stripe/payment-intent-utils";
import { quoteOperatorTrip } from "@/lib/booking/quote-server";
import { getStripeServer } from "@/lib/stripe/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SetupTripPaymentResult = {
  client_secret: string;
  payment_intent_id: string;
  platform_fee: number;
  operator_payout: number;
  total: number;
  commission_percentage: number;
  stripe_ready: boolean;
  quote: Awaited<ReturnType<typeof quoteOperatorTrip>>;
  reused: boolean;
};

export async function setupPaymentIntentForTrip(
  supabase: SupabaseClient,
  operatorId: string,
  trip: QuoteRequestTrip,
  options?: {
    reuse_payment_intent_id?: string;
    supersede_payment_intent_id?: string;
  },
): Promise<SetupTripPaymentResult> {
  const quote = await quoteOperatorTrip(operatorId, trip);
  if (!quote) {
    throw new Error("Operator pricing not configured");
  }

  const stripe = getStripeServer();
  const reuseId = options?.reuse_payment_intent_id?.trim();

  if (reuseId) {
    try {
      const existing = await stripe.paymentIntents.retrieve(reuseId);
      const metaOperator = existing.metadata?.operator_id;
      if (
        metaOperator === operatorId &&
        isPaymentIntentReusable(existing.status) &&
        paymentIntentAmountMatches(existing, quote.total) &&
        existing.client_secret
      ) {
        const operator = await getOperatorPaymentEligibility(supabase, operatorId);
        return {
          client_secret: existing.client_secret,
          payment_intent_id: existing.id,
          platform_fee: quote.platform_fee,
          operator_payout: quote.operator_subtotal,
          total: quote.total,
          commission_percentage: quote.platform_fee_percent,
          stripe_ready: operator.stripe_ready,
          quote,
          reused: true,
        };
      }
    } catch {
      /* create fresh intent below */
    }

    await cancelPendingBookingsForPaymentIntent(supabase, reuseId);
  }

  const supersedeId = options?.supersede_payment_intent_id?.trim();
  if (supersedeId && supersedeId !== reuseId) {
    await cancelPendingBookingsForPaymentIntent(supabase, supersedeId);
    try {
      await stripe.paymentIntents.cancel(supersedeId);
    } catch {
      /* already canceled or succeeded */
    }
  }

  const setup = await createPaymentIntentForTrip(supabase, operatorId, trip);

  return {
    client_secret: setup.client_secret,
    payment_intent_id: setup.payment_intent_id,
    platform_fee: setup.platform_fee,
    operator_payout: setup.operator_payout,
    total: setup.total,
    commission_percentage: setup.commission_percentage,
    stripe_ready: setup.stripe_ready,
    quote: setup.quote,
    reused: false,
  };
}
