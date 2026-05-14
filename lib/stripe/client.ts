import { loadStripe, type Stripe } from "@stripe/stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();

/**
 * Stripe.js loader for the browser (Connect.js / Elements later).
 * `null` when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is unset.
 */
export const stripePromise = publishableKey
  ? loadStripe(publishableKey)
  : null;

/** Same instance as `stripePromise` (for call sites that prefer a getter). */
export function getStripe(): Promise<Stripe | null> | null {
  return stripePromise;
}
