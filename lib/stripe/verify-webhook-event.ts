import type Stripe from "stripe";
import { getRuntimeEnv } from "@/lib/env/runtime";
import { getStripeServer } from "@/lib/stripe/server";

/** Platform (your account) + Connect webhook signing secrets — same URL, different Stripe endpoints. */
export function getStripeWebhookSecrets(): string[] {
  const secrets = [
    getRuntimeEnv("STRIPE_WEBHOOK_SECRET"),
    getRuntimeEnv("STRIPE_CONNECT_WEBHOOK_SECRET"),
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(secrets));
}

/**
 * Verify a Stripe webhook payload against platform and/or Connect signing secrets.
 */
export function constructStripeWebhookEvent(
  body: string,
  signature: string,
): Stripe.Event {
  const stripe = getStripeServer();
  const secrets = getStripeWebhookSecrets();

  if (secrets.length === 0) {
    throw new Error(
      "No Stripe webhook secrets configured (STRIPE_WEBHOOK_SECRET / STRIPE_CONNECT_WEBHOOK_SECRET)",
    );
  }

  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(body, signature, secret);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Webhook signature verification failed");
}
