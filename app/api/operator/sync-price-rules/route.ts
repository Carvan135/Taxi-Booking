import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/getServerSession";
import { ensureOperatorPriceRules } from "@/lib/booking/ensure-price-rules";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "operator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: operator, error } = await supabase
      .from("operators")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error || !operator) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    await ensureOperatorPriceRules(operator.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("sync-price-rules error:", err);
    return NextResponse.json(
      { error: "Could not sync price rules" },
      { status: 500 },
    );
  }
}
