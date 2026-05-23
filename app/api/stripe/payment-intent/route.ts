import { NextResponse } from "next/server";
import { paymentIntentBodySchema } from "@/lib/booking/api-schemas";
import { setupPaymentIntentForTrip } from "@/lib/stripe/setup-payment-intent";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = paymentIntentBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { operator_id, trip, reuse_payment_intent_id, supersede_payment_intent_id } =
      parsed.data;

    const supabase = createServiceRoleClient();
    const setup = await setupPaymentIntentForTrip(supabase, operator_id, trip, {
      reuse_payment_intent_id,
      supersede_payment_intent_id,
    });

    if (!setup.quote) {
      return NextResponse.json(
        { error: "Operator pricing not configured" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      client_secret: setup.client_secret,
      payment_intent_id: setup.payment_intent_id,
      platform_fee: setup.platform_fee,
      operator_payout: setup.operator_payout,
      total: setup.total,
      commission_percentage: setup.commission_percentage,
      stripe_ready: setup.stripe_ready,
      quote: setup.quote,
      reused: setup.reused,
    });
  } catch (err) {
    console.error("payment-intent error:", err);
    const message =
      err instanceof Error ? err.message : "Unable to set up payment. Please try again.";
    const status =
      message.includes("not available") ||
      message.includes("not accepting") ||
      message.includes("payouts")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
