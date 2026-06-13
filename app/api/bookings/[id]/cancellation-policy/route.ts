import { NextResponse } from "next/server";
import { evaluateCancellationPolicy } from "@/lib/booking/cancellation-policy";
import { getCancellationPolicySettings } from "@/lib/booking/platform-settings-server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        "id, customer_id, pickup_date, pickup_time, journey_started_at, payment_status",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await getCancellationPolicySettings(supabase);
    const evaluation = evaluateCancellationPolicy(
      booking.pickup_date,
      String(booking.pickup_time),
      settings,
      {
        journeyStarted: Boolean(booking.journey_started_at),
        paymentStatus: booking.payment_status,
      },
    );

    return NextResponse.json({
      ...evaluation,
      cutoffHours: settings.cutoffHours,
      fullRefundHours: settings.fullRefundHours,
    });
  } catch (err) {
    console.error("cancellation-policy error:", err);
    return NextResponse.json(
      { error: "Could not load cancellation policy" },
      { status: 500 },
    );
  }
}
