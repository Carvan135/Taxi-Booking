import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

type StripeConfigBody = {
  publishableKey?: string;
  publishable_key?: string;
};

function readKeyFromBody(body: StripeConfigBody): string | null {
  return body.publishableKey?.trim() || body.publishable_key?.trim() || null;
}

async function fetchPublishableKeyFromApi(): Promise<string | null> {
  const endpoints = [
    "/api/stripe/payment-intent",
    "/api/stripe/publishable-key",
    "/api/stripe/config",
    "/api/health",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const body = (await res.json()) as StripeConfigBody;
      const key = readKeyFromBody(body);
      if (key) return key;
    } catch {
      /* try next endpoint */
    }
  }

  return null;
}

/** Load Stripe.js with a known publishable key (e.g. from payment-intent POST). */
export function initStripeWithKey(publishableKey: string): Promise<Stripe | null> {
  const key = publishableKey.trim();
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

/**
 * Prefer a server-provided key, then build-time env, then config API fallbacks.
 */
export async function resolveStripeClient(
  publishableKeyFromServer?: string | null,
): Promise<Stripe | null> {
  const bundled = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (bundled) {
    return getStripePromise();
  }

  const serverKey = publishableKeyFromServer?.trim();
  if (serverKey) {
    return initStripeWithKey(serverKey);
  }

  return getStripePromise();
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
