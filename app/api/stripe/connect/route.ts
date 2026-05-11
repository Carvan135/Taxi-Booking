import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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
      .select("id, stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (operatorError || !operator) {
      return NextResponse.json(
        {
          error:
            "Operator profile not found. Complete Step 1 onboarding first.",
        },
        { status: 400 },
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      new URL(request.url).origin;

    let accountId = operator.stripe_account_id;

    if (!accountId) {
      try {
        const account = await stripe.accounts.create({
          type: "express",
          country: "GB",
          email: profile.email ?? user.email ?? undefined,
          business_profile: {
            name: profile.full_name ?? undefined,
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        accountId = account.id;

        const { error: saveError } = await supabase
          .from("operators")
          .update({ stripe_account_id: accountId })
          .eq("id", operator.id);

        if (saveError) {
          return NextResponse.json(
            { error: saveError.message },
            { status: 500 },
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not create Stripe account.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/operator/onboarding?stripe_refresh=1`,
        return_url: `${origin}/api/stripe/connect/callback`,
        type: "account_onboarding",
      });

      return NextResponse.json({ url: accountLink.url });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create account link.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
