import { getStripePublishableKey } from "@/lib/stripe/publishable-key";

/** Safe client fields returned alongside payment setup API responses. */
export function stripeClientApiFields(): { publishable_key: string | null } {
  return { publishable_key: getStripePublishableKey() };
}
