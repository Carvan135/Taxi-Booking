import { NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/auth/operator-api";
import { getOperatorAvailableEarnings } from "@/lib/operator/release-operator-earnings";
import { canReceivePayout } from "@/lib/stripe/payoutGuard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const operator = await getOperatorForUser(supabase, user.id);
    if (!operator) {
      return NextResponse.json(
        { error: "Operator access required." },
        { status: 403 },
      );
    }

    const guard = await canReceivePayout(operator.id);
    const available = await getOperatorAvailableEarnings(supabase, operator.id);

    return NextResponse.json({
      count: available.count,
      total_amount: available.totalAmount,
      can_withdraw: guard.allowed && available.count > 0,
      block_reason: guard.allowed
        ? available.count === 0
          ? "No earnings are ready to withdraw yet. Completed trips become available after the payout waiting period."
          : null
        : (guard.reason ?? "Complete Stripe payout setup first."),
    });
  } catch (err) {
    console.error("available-earnings error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
