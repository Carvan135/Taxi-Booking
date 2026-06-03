import Stripe from "stripe";

let stripeSingleton: Stripe | undefined;

/**
 * Stripe server SDK (singleton). Throws if STRIPE_SECRET_KEY is missing.
 * Lazy-init avoids build-time failures when env vars are empty.
 */
export function getStripeServer(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(secretKey, {
      /** Matches stripe@22 pinned OpenAPI version — update when upgrading `stripe`. */
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return stripeSingleton;
}
