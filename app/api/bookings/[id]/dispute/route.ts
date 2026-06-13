import { NextResponse } from "next/server";
import { z } from "zod";
import {
  sendCustomerTripEmail,
  sendOperatorTripEmail,
} from "@/lib/email/dispatch";
import { getNotificationContent } from "@/lib/notifications/messages";
import {
  fetchAdminUserIds,
  sendNotification,
  sendNotificationToMultiple,
} from "@/lib/notifications/send";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { COMPLETION_STATUS } from "@/lib/validations/enums";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be at most 500 characters"),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
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

    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.reason?.[0] ?? "Invalid request" },
        { status: 400 },
      );
    }

    const { data: booking, error: readError } = await supabase
      .from("bookings")
      .select(
        "id, reference, customer_id, customer_email, customer_name, operator_id, completion_status",
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
        { error: "Can only dispute after operator marks complete" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const admin = createServiceRoleClient();
    const { error: updateError } = await admin
      .from("bookings")
      .update({
        completion_status: COMPLETION_STATUS.disputed,
        dispute_raised_at: now,
        dispute_reason: parsed.data.reason,
        auto_complete_at: null,
        updated_at: now,
      })
      .eq("id", bookingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const content = getNotificationContent("dispute_raised", {
      reference: booking.reference,
    });
    await sendNotification({
      user_id: user.id,
      type: "dispute_raised",
      title: content.title,
      message: content.message,
      booking_id: bookingId,
    });

    const adminIds = await fetchAdminUserIds();
    await sendNotificationToMultiple(adminIds, {
      type: "dispute_raised",
      title: "Dispute Raised by Customer",
      message: `Customer raised a dispute for booking ${booking.reference}: ${parsed.data.reason}`,
      booking_id: bookingId,
      metadata: { reference: booking.reference, reason: parsed.data.reason },
    });

    await sendCustomerTripEmail(admin, {
      bookingId,
      reference: booking.reference,
      customerEmail: booking.customer_email,
      customerId: booking.customer_id,
      customerName: booking.customer_name,
      type: "dispute_raised",
    });

    if (booking.operator_id) {
      await sendOperatorTripEmail(admin, {
        operatorId: booking.operator_id,
        bookingId,
        type: "dispute_raised",
        reference: booking.reference,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("dispute error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
