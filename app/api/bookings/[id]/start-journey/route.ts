import { NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/auth/operator-api";
import { sendCustomerTripEmail } from "@/lib/email/dispatch";
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
        "id, reference, status, operator_id, customer_id, customer_email, customer_name, payment_status, completion_status, journey_started_at",
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
        { error: "Start journey is only available for confirmed bookings" },
        { status: 400 },
      );
    }

    if (booking.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment must be confirmed before starting the journey" },
        { status: 400 },
      );
    }

    if (booking.completion_status !== COMPLETION_STATUS.none) {
      return NextResponse.json(
        { error: "This booking is no longer in the active trip phase" },
        { status: 400 },
      );
    }

    if (booking.journey_started_at) {
      return NextResponse.json(
        { error: "Journey has already been started" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const admin = createServiceRoleClient();
    const { error: updateError } = await admin
      .from("bookings")
      .update({
        journey_started_at: now,
        updated_at: now,
      })
      .eq("id", bookingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const content = getNotificationContent("journey_started", {
      reference: booking.reference,
    });
    let notifyUserId = booking.customer_id as string | null;
    if (!notifyUserId && booking.customer_email) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .ilike("email", booking.customer_email.trim())
        .maybeSingle();
      notifyUserId = (profile?.id as string | undefined) ?? null;
    }
    if (notifyUserId) {
      await sendNotification({
        user_id: notifyUserId,
        type: "journey_started",
        title: content.title,
        message: content.message,
        booking_id: bookingId,
        metadata: { reference: booking.reference },
      });
    }

    await sendCustomerTripEmail(admin, {
      bookingId,
      reference: booking.reference,
      customerEmail: booking.customer_email,
      customerId: booking.customer_id,
      customerName: booking.customer_name,
      type: "journey_started",
    });

    return NextResponse.json({ success: true, journey_started_at: now });
  } catch (err) {
    console.error("start-journey error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
