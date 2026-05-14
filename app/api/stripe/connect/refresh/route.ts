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

export async function GET(request: Request) {
  const origin = appOrigin(request);
  const url = new URL(request.url);
  const returnPath = normalizeOperatorConnectReturnPath(
    url.searchParams.get("returnTo"),
  );
  const returnToParam = encodeURIComponent(returnPath);
  const fallback = new URL(returnPath, origin);

  try {
    const stripe = getStripeServer();
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.redirect(new URL("/login", origin));
    }

    const { data: operator } = await supabase
      .from("operators")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!operator?.stripe_account_id) {
      return NextResponse.redirect(fallback);
    }

    const accountLink = await stripe.accountLinks.create({
      account: operator.stripe_account_id,
      refresh_url: `${origin}/api/stripe/connect/refresh?returnTo=${returnToParam}`,
      return_url: `${origin}${returnPath}?stripe=success`,
      type: "account_onboarding",
    });

    return NextResponse.redirect(accountLink.url);
  } catch (err) {
    console.error("Stripe refresh error:", err);
    return NextResponse.redirect(fallback);
  }
}
