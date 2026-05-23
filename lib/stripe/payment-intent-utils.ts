import type Stripe from "stripe";

/** PI can still be paid by the customer in Checkout / Elements. */
export function isPaymentIntentReusable(
  status: Stripe.PaymentIntent.Status,
): boolean {
  return (
    status === "requires_payment_method" ||
    status === "requires_confirmation" ||
    status === "requires_action"
  );
}

/** Payment may still complete (async methods) or already did. */
export function isPaymentIntentSucceededOrProcessing(
  status: Stripe.PaymentIntent.Status,
): boolean {
  return status === "succeeded" || status === "processing";
}

export function paymentIntentAmountMatches(
  intent: Stripe.PaymentIntent,
  totalPounds: number,
): boolean {
  return intent.amount === Math.round(totalPounds * 100);
}
