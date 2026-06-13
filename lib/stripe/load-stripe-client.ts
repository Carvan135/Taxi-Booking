import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

type StripeConfigBody = {
  publishableKey?: string;
};

async function fetchPublishableKeyFromApi(): Promise<string | null> {
  const endpoints = [
    "/api/stripe/payment-intent",
    "/api/stripe/config",
    "/api/health",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const body = (await res.json()) as StripeConfigBody;
      const key = body.publishableKey?.trim();
      if (key) return key;
    } catch {
      /* try next endpoint */
    }
  }

  return null;
}

/**
 * Load Stripe.js using the build-time key when present, otherwise fetch from
 * known API routes at runtime (required on Cloudflare when NEXT_PUBLIC_* is
 * only set as a deploy secret, not a build variable).
 */
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = (async () => {
      const bundled = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
      if (bundled) {
        return loadStripe(bundled);
      }

      const key = await fetchPublishableKeyFromApi();
      if (!key) return null;
      return loadStripe(key);
    })();
  }
  return stripePromise;
}
