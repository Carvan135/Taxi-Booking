import { NextResponse } from "next/server";
import { reconcileUnpaidBookingsForPaymentIntents } from "@/lib/stripe/reconcile-payment-intent";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Sync Stripe payment state for this operator's unpaid bookings (safety net when webhooks lag). */
export async function POST() {
  try {
    const authClient = createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const { data: operator, error: opError } = await supabase
      .from("operators")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (opError) throw opError;
    if (!operator) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    const { data: unpaid, error: listError } = await supabase
      .from("bookings")
      .select("stripe_payment_intent_id")
      .eq("operator_id", operator.id)
      .neq("payment_status", "paid")
      .not("stripe_payment_intent_id", "is", null);

    if (listError) throw listError;

    const intentIds = (unpaid ?? [])
      .map((row) => row.stripe_payment_intent_id)
      .filter((id): id is string => Boolean(id?.trim()));

    await reconcileUnpaidBookingsForPaymentIntents(supabase, intentIds, {
      sendNotifications: true,
    });

    return NextResponse.json({ ok: true, reconciled: intentIds.length });
  } catch (err) {
    console.error("operator/reconcile-payments error:", err);
    return NextResponse.json(
      { error: "Could not reconcile payments" },
      { status: 500 },
    );
  }
}
