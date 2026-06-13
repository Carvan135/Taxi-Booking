import { NextResponse } from "next/server";
import { getStripePublishableKey } from "@/lib/stripe/publishable-key";

export const dynamic = "force-dynamic";

/** Runtime Stripe.js config — works when NEXT_PUBLIC_* was not inlined at build time. */
export async function GET() {
  const publishableKey = getStripePublishableKey();
  if (!publishableKey) {
    return NextResponse.json(
      { error: "Stripe publishable key is not configured" },
      { status: 503 },
    );
  }
  return NextResponse.json({ publishableKey });
}
