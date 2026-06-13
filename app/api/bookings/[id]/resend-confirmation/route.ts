import { NextResponse } from "next/server";
import { emitResendBookingConfirmationEmail } from "@/lib/email/booking-events";
import { getProfile, getUser } from "@/lib/auth/helpers";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;
    const supabase = createClient();
    const user = await getUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const profile = await getProfile(supabase, user.id);
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createServiceRoleClient();
    const result = await emitResendBookingConfirmationEmail(admin, bookingId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Could not resend confirmation" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("resend-confirmation error:", err);
    return NextResponse.json(
      { error: "Could not resend confirmation" },
      { status: 500 },
    );
  }
}
