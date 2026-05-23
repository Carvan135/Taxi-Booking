import { NextResponse } from "next/server";
import {
  addHours,
  getPayoutDelayHours,
} from "@/lib/booking/platform-settings-server";
import { getNotificationContent } from "@/lib/notifications/messages";
import { sendNotification } from "@/lib/notifications/send";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  BOOKING_STATUS,
  COMPLETION_STATUS,
} from "@/lib/validations/enums";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
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

    const { data: booking, error: readError } = await supabase
      .from("bookings")
      .select(
        "id, reference, status, customer_id, operator_id, completion_status",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (readError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (booking.completion_status !== COMPLETION_STATUS.operator_marked_complete) {
      return NextResponse.json(
        { error: "Booking is not awaiting your confirmation" },
        { status: 400 },
      );
    }

    const payoutDelayHours = await getPayoutDelayHours();
    const now = new Date();
    const payoutEligibleAt = addHours(now, payoutDelayHours);

    const admin = createServiceRoleClient();
    const { error: updateError } = await admin
      .from("bookings")
      .update({
        completion_status: COMPLETION_STATUS.customer_confirmed,
        status: BOOKING_STATUS.completed,
        customer_confirmed_at: now.toISOString(),
        completed_at: now.toISOString(),
        payout_eligible_at: payoutEligibleAt,
        auto_complete_at: null,
        updated_at: now.toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (booking.operator_id) {
      const { data: op } = await supabase
        .from("operators")
        .select("user_id")
        .eq("id", booking.operator_id)
        .maybeSingle();

      if (op?.user_id) {
        const content = getNotificationContent("completion_confirmed", {
          reference: booking.reference,
        });
        await sendNotification({
          user_id: op.user_id,
          type: "completion_confirmed",
          title: content.title,
          message: content.message,
          booking_id: bookingId,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("confirm-complete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
