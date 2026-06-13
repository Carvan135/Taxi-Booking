import { stripePublishableKeyResponse } from "@/lib/stripe/stripe-config-response";

export const dynamic = "force-dynamic";

/** Alias for /api/stripe/config — avoids reserved "config" path issues on some hosts. */
export async function GET() {
  return stripePublishableKeyResponse();
}
