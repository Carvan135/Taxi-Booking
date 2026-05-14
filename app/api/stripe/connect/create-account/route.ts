import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const stripe = getStripeServer();
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
      .select("role, email, full_name")
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
      .select("id, stripe_account_id, business_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (operatorError || !operator) {
      return NextResponse.json(
        { error: "Operator record not found" },
        { status: 404 },
      );
    }

    if (operator.stripe_account_id) {
      return NextResponse.json({
        stripe_account_id: operator.stripe_account_id,
      });
    }

    const account = await stripe.accounts.create({
      type: "express",
      country: "GB",
      email: profile.email ?? user.email ?? undefined,
      business_type: "individual",
      business_profile: {
        name: profile.full_name ?? operator.business_name ?? undefined,
      },
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      metadata: {
        operator_id: operator.id,
        user_id: user.id,
      },
    });

    const { error: updateError } = await supabase
      .from("operators")
      .update({
        stripe_account_id: account.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", operator.id);

    if (updateError) {
      console.error("Failed to save stripe_account_id:", updateError);
      return NextResponse.json(
        { error: "Failed to save Stripe account" },
        { status: 500 },
      );
    }

    return NextResponse.json({ stripe_account_id: account.id });
  } catch (err) {
    console.error("Stripe account creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
