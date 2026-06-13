import { NextResponse } from "next/server";
import { getStripePublishableKey } from "@/lib/stripe/publishable-key";

export function stripePublishableKeyResponse(): NextResponse {
  const publishableKey = getStripePublishableKey();
  if (!publishableKey) {
    return NextResponse.json(
      { error: "Stripe publishable key is not configured" },
      { status: 503 },
    );
  }
  return NextResponse.json({ publishableKey });
}
