import { NextResponse } from "next/server";
import { z } from "zod";
import {
  emitRefundConfirmationEmail,
  fireBookingEmail,
} from "@/lib/email/booking-events";
import { getProfile, getUser } from "@/lib/auth/helpers";
import { getNotificationContent } from "@/lib/notifications/messages";
import { sendNotification } from "@/lib/notifications/send";
import { createBookingRefund } from "@/lib/stripe/process-refund";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { PAYMENT_STATUSES } from "@/lib/validations/enums";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
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

    const json: unknown = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data: booking, error: readError } = await supabase
      .from("bookings")
      .select(
        "id, reference, customer_id, customer_email, price, payment_status, stripe_payment_intent_id",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (readError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.payment_status !== PAYMENT_STATUSES[1]) {
      return NextResponse.json(
        { error: "Only paid bookings can be refunded" },
        { status: 400 },
      );
    }

    const price = Number(booking.price ?? 0);
    const amount = Math.round(parsed.data.amount * 100) / 100;

    if (amount > price) {
      return NextResponse.json(
        { error: "Refund amount cannot exceed the booking price" },
        { status: 400 },
      );
    }

    const paymentIntentId = booking.stripe_payment_intent_id?.trim();
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "No Stripe payment found for this booking" },
        { status: 400 },
      );
    }

    const refundType = amount === price ? "full" : "partial";
    const amountPence = Math.round(amount * 100);

    let stripeRefundId: string;
    try {
      const refund = await createBookingRefund({
        paymentIntentId,
        amountPence,
        idempotencyKey: `admin-refund-${bookingId}-${amountPence}`,
        reason: "requested_by_customer",
      });
      stripeRefundId = refund.id;
    } catch (err) {
      console.error("admin Stripe refund failed:", err);
      return NextResponse.json(
        { error: "Could not process Stripe refund" },
        { status: 502 },
      );
    }

    const now = new Date().toISOString();
    const admin = createServiceRoleClient();
    const { error: updateError } = await admin
      .from("bookings")
      .update({
        payment_status: PAYMENT_STATUSES[2],
        stripe_payment_status: PAYMENT_STATUSES[2],
        refund_amount: amount,
        refund_type: refundType,
        refunded_at: now,
        refunded_by: user.id,
        stripe_refund_id: stripeRefundId,
        cancellation_reason: parsed.data.reason.trim(),
        updated_at: now,
      })
      .eq("id", bookingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const email = booking.customer_email?.trim();
    if (email) {
      fireBookingEmail(() =>
        emitRefundConfirmationEmail(admin, {
          bookingId,
          reference: booking.reference,
          email,
          amount,
          refundType,
          customerId: booking.customer_id,
        }),
      );
    }

    if (booking.customer_id) {
      const content = getNotificationContent("dispute_resolved", {
        reference: booking.reference,
      });
      await sendNotification({
        user_id: booking.customer_id,
        type: "dispute_resolved",
        title: content.title,
        message: `${content.message} A refund of £${amount.toFixed(2)} has been processed.`,
        booking_id: bookingId,
      });
    }

    return NextResponse.json({ success: true, refund_amount: amount });
  } catch (err) {
    console.error("admin/refund error:", err);
    return NextResponse.json(
      { error: "Could not process refund" },
      { status: 500 },
    );
  }
}
