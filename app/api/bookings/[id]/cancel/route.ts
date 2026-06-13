import { NextResponse } from "next/server";
import { evaluateCancellationPolicy } from "@/lib/booking/cancellation-policy";
import { getCancellationPolicySettings } from "@/lib/booking/platform-settings-server";
import {
  emitCancellationConfirmationEmail,
  fireBookingEmail,
} from "@/lib/email/booking-events";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { BOOKING_STATUS } from "@/lib/validations/enums";

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
        "id, reference, status, payment_status, customer_id, customer_email, pickup_date, pickup_time, journey_started_at, price, group_reference",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (readError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      booking.status === BOOKING_STATUS.completed ||
      booking.status === BOOKING_STATUS.cancelled
    ) {
      return NextResponse.json(
        { error: "This booking cannot be cancelled" },
        { status: 400 },
      );
    }

    const admin = createServiceRoleClient();
    const settings = await getCancellationPolicySettings(admin);
    const policy = evaluateCancellationPolicy(
      booking.pickup_date,
      booking.pickup_time,
      settings,
      {
        journeyStarted: Boolean(booking.journey_started_at),
        paymentStatus: booking.payment_status,
      },
    );

    if (!policy.allowed) {
      return NextResponse.json({ error: policy.summary }, { status: 400 });
    }

    const { error: cancelError } = await supabase.rpc("customer_cancel_booking", {
      p_booking_id: bookingId,
    });

    if (cancelError) {
      console.error("cancel booking rpc:", cancelError);
      return NextResponse.json(
        { error: "Could not cancel booking" },
        { status: 500 },
      );
    }

    const paid = booking.payment_status === "paid";
    const price = Number(booking.price ?? 0);
    const refundAmount =
      paid && policy.fullRefundEligible && price > 0 ? price : undefined;

    const email = booking.customer_email?.trim();
    if (email) {
      fireBookingEmail(() =>
        emitCancellationConfirmationEmail(admin, {
          bookingId,
          reference: booking.reference,
          email,
          customerId: booking.customer_id,
          refundAmount,
        }),
      );
    }

    return NextResponse.json({ success: true, refund_initiated: refundAmount != null });
  } catch (err) {
    console.error("bookings/cancel error:", err);
    return NextResponse.json(
      { error: "Could not cancel booking" },
      { status: 500 },
    );
  }
}
