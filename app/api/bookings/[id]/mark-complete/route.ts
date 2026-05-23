import { NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/auth/operator-api";
import {
  addHours,
  getAutoCompleteHours,
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

    const operator = await getOperatorForUser(supabase, user.id);
    if (!operator) {
      return NextResponse.json(
        { error: "Operator access required." },
        { status: 403 },
      );
    }

    const { data: booking, error: readError } = await supabase
      .from("bookings")
      .select(
        "id, reference, status, operator_id, customer_id, completion_status, journey_started_at, payment_status",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (readError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.operator_id !== operator.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (booking.status !== BOOKING_STATUS.confirmed) {
      return NextResponse.json(
        { error: "Only confirmed bookings can be marked complete" },
        { status: 400 },
      );
    }

    if (!booking.journey_started_at) {
      return NextResponse.json(
        { error: "Start the journey before marking this trip complete" },
        { status: 400 },
      );
    }

    const autoCompleteHours = await getAutoCompleteHours();
    const now = new Date();
    const autoCompleteAt = addHours(now, autoCompleteHours);

    const admin = createServiceRoleClient();
    const { error: updateError } = await admin
      .from("bookings")
      .update({
        completion_status: COMPLETION_STATUS.operator_marked_complete,
        completion_requested_at: now.toISOString(),
        completion_requested_by: user.id,
        auto_complete_at: autoCompleteAt,
        updated_at: now.toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (booking.customer_id) {
      const content = getNotificationContent("operator_marked_complete", {
        reference: booking.reference,
        hours: String(autoCompleteHours),
      });
      await sendNotification({
        user_id: booking.customer_id,
        type: "operator_marked_complete",
        title: content.title,
        message: content.message,
        booking_id: bookingId,
        metadata: { reference: booking.reference },
      });
    }

    return NextResponse.json({
      success: true,
      auto_complete_at: autoCompleteAt,
    });
  } catch (err) {
    console.error("mark-complete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
