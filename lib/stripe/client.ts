import type { Stripe } from "@stripe/stripe-js";
import { getStripePromise } from "@/lib/stripe/load-stripe-client";

/**
 * @deprecated Prefer `getStripePromise()` — supports runtime config on Cloudflare.
 * Resolves null when the publishable key is unavailable at build time and runtime.
 */
export const stripePromise: Promise<Stripe | null> = getStripePromise();

/** Same instance as `stripePromise`. */
export function getStripe(): Promise<Stripe | null> {
  return getStripePromise();
}
