import { NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/auth/operator-api";
import { createClient } from "@/lib/supabase/server";

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

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("operators")
      .update({
        is_paused: true,
        paused_at: now,
        paused_until: null,
        updated_at: now,
      })
      .eq("id", operator.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("operator pause error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

