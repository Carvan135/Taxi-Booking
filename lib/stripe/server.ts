import Stripe from "stripe";
import { getRuntimeEnv } from "@/lib/env/runtime";

let stripeSingleton: Stripe | undefined;

/**
 * Stripe server SDK (singleton). Throws if STRIPE_SECRET_KEY is missing.
 * Lazy-init avoids build-time failures when env vars are empty.
 */
export function getStripeServer(): Stripe {
  const secretKey = getRuntimeEnv("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(secretKey, {
      /** Matches stripe@22 pinned OpenAPI version — update when upgrading `stripe`. */
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
      /**
       * Cloudflare Workers (OpenNext) has no Node http/https stack, so the SDK's
       * default client fails with "connection to Stripe" errors. Use the
       * Workers-native fetch-based client instead.
       */
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return stripeSingleton;
}
