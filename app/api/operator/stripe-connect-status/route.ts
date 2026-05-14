import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import type { OperatorStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "operator") {
    return NextResponse.json(
      { error: "Operator access required." },
      { status: 403 },
    );
  }

  const { data: operator, error: operatorError } = await supabase
    .from("operators")
    .select(
      "id, status, stripe_account_id, stripe_onboarding_complete, stripe_payouts_enabled, stripe_connected_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (operatorError || !operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const snapshot = {
    id: operator.id,
    status: (operator.status ?? "pending") as OperatorStatus,
    stripe_account_id: operator.stripe_account_id,
    stripe_onboarding_complete: operator.stripe_onboarding_complete === true,
    stripe_payouts_enabled: operator.stripe_payouts_enabled === true,
    stripe_connected_at: operator.stripe_connected_at,
  };

  if (!snapshot.stripe_account_id) {
    return NextResponse.json({
      operator: snapshot,
      stripe: null,
    });
  }

  try {
    const stripe = getStripeServer();
    const account = await stripe.accounts.retrieve(snapshot.stripe_account_id);
    const req = account.requirements;
    const disabledReason = (
      account as { disabled_reason?: string | null }
    ).disabled_reason;

    return NextResponse.json({
      operator: snapshot,
      stripe: {
        id: account.id,
        type: account.type,
        details_submitted: account.details_submitted ?? false,
        charges_enabled: account.charges_enabled ?? false,
        payouts_enabled: account.payouts_enabled ?? false,
        disabled_reason: disabledReason ?? null,
        currently_due: req?.currently_due ?? [],
        eventually_due: req?.eventually_due ?? [],
        past_due: req?.past_due ?? [],
        pending_verification: req?.pending_verification ?? [],
        errors:
          req?.errors?.map((e) => ({
            code: e.code,
            reason: e.reason,
            requirement: e.requirement,
          })) ?? [],
      },
    });
  } catch (err) {
    console.error("stripe-connect-status:", err);
    return NextResponse.json({
      operator: snapshot,
      stripe: null,
      stripe_error: "Could not load live status from Stripe. Try again shortly.",
    });
  }
}
