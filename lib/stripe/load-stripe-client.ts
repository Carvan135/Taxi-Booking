import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Load Stripe.js using the build-time key when present, otherwise fetch from
 * `/api/stripe/config` at runtime (required on Cloudflare when NEXT_PUBLIC_* is
 * only set as a deploy secret, not a build variable).
 */
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = (async () => {
      const bundled = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
      if (bundled) {
        return loadStripe(bundled);
      }

      try {
        const res = await fetch("/api/stripe/config");
        if (!res.ok) return null;
        const body = (await res.json()) as { publishableKey?: string };
        if (!body.publishableKey?.trim()) return null;
        return loadStripe(body.publishableKey.trim());
      } catch {
        return null;
      }
    })();
  }
  return stripePromise;
}
