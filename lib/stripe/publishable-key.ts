/** Stripe publishable key — safe to expose to the browser. */
export function getStripePublishableKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    null
  );
}

export function isStripePublishableKeyConfigured(): boolean {
  return getStripePublishableKey() != null;
}
