import { loadStripe } from "@stripe/stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();

/**
 * Stripe.js loader for the browser (Connect.js / Elements later).
 * `null` when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is unset.
 */
export const stripePromise = publishableKey
  ? loadStripe(publishableKey)
  : null;
