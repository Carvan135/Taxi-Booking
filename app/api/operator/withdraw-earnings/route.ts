import { NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/auth/operator-api";
import { releaseEligiblePayoutsForOperator } from "@/lib/operator/release-operator-earnings";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
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

    const admin = createServiceRoleClient();
    const result = await releaseEligiblePayoutsForOperator(
      admin,
      operator.id,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Could not withdraw earnings" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      released: result.released,
      total_amount: result.totalAmount,
    });
  } catch (err) {
    console.error("withdraw-earnings error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
