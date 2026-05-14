import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 50;

export async function GET(request: Request) {
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
    .select("stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (operatorError || !operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const accountId = operator.stripe_account_id as string | null;
  if (!accountId) {
    return NextResponse.json({ payouts: [], has_account: false });
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? "20");
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 20),
  );

  try {
    const stripe = getStripeServer();
    const list = await stripe.payouts.list(
      { limit },
      { stripeAccount: accountId },
    );

    const payouts = list.data.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      arrival_date: p.arrival_date,
      created: p.created,
      description: p.description,
      failure_message: p.failure_message,
      method: p.method,
    }));

    return NextResponse.json({ payouts, has_account: true });
  } catch (err) {
    console.error("stripe-payouts:", err);
    return NextResponse.json(
      { error: "Could not load payouts from Stripe." },
      { status: 502 },
    );
  }
}
