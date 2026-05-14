import { NextResponse } from "next/server";
import { normalizeOperatorConnectReturnPath } from "@/lib/stripe/operatorConnectReturnPath";
import { getStripeServer } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

function appOrigin(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    new URL(request.url).origin
  );
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeServer();
    const supabase = createClient();
    const origin = appOrigin(request);

    let returnPath = "/operator/dashboard";
    try {
      const body = (await request.json()) as { returnPath?: unknown } | null;
      if (body && typeof body.returnPath === "string") {
        returnPath = normalizeOperatorConnectReturnPath(body.returnPath);
      }
    } catch {
      /* empty or non-JSON body — use default */
    }
    const returnToParam = encodeURIComponent(returnPath);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: operator, error: operatorError } = await supabase
      .from("operators")
      .select("id, stripe_account_id, status, business_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (operatorError || !operator) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    if (operator.status !== "approved") {
      return NextResponse.json(
        { error: "Operator not yet approved" },
        { status: 403 },
      );
    }

    let accountId = operator.stripe_account_id;

    if (!accountId) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 500 },
        );
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
      accountId = account.id;

      const { error: saveError } = await supabase
        .from("operators")
        .update({
          stripe_account_id: accountId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", operator.id);

      if (saveError) {
        console.error("Failed to save stripe_account_id:", saveError);
        return NextResponse.json(
          { error: "Failed to save Stripe account" },
          { status: 500 },
        );
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/api/stripe/connect/refresh?returnTo=${returnToParam}`,
      return_url: `${origin}${returnPath}?stripe=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("Account link generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate onboarding link" },
      { status: 500 },
    );
  }
}
