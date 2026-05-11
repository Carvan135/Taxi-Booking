import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const dashboardUrl = new URL("/operator/dashboard", request.url);

  try {
    const stripe = getStripeServer();

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: operator, error: operatorError } = await supabase
      .from("operators")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (operatorError || !operator?.stripe_account_id) {
      const onboarding = new URL("/operator/onboarding", request.url);
      onboarding.searchParams.set("stripe_error", "missing_account");
      return NextResponse.redirect(onboarding);
    }

    try {
      const account = await stripe.accounts.retrieve(operator.stripe_account_id);

      if (account.details_submitted) {
        const { error: updateError } = await supabase
          .from("operators")
          .update({ stripe_onboarding_complete: true })
          .eq("user_id", user.id);

        if (updateError) {
          dashboardUrl.searchParams.set("stripe_warning", "save_failed");
        }
      }
    } catch (err) {
      dashboardUrl.searchParams.set(
        "stripe_warning",
        err instanceof Error ? err.message.slice(0, 80) : "retrieve_failed",
      );
      return NextResponse.redirect(dashboardUrl);
    }

    return NextResponse.redirect(dashboardUrl);
  } catch {
    dashboardUrl.searchParams.set("stripe_warning", "callback_error");
    return NextResponse.redirect(dashboardUrl);
  }
}
