import { NextResponse } from "next/server";
import { getNotificationContent } from "@/lib/notifications/messages";
import { sendNotification } from "@/lib/notifications/send";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { BOOKING_STATUS } from "@/lib/validations/enums";
import { bookingReviewSchema } from "@/lib/validations/review";

export const dynamic = "force-dynamic";

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

    const body = await req.json().catch(() => ({}));
    const parsed = bookingReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid review" },
        { status: 400 },
      );
    }

    const { data: booking, error: readError } = await supabase
      .from("bookings")
      .select("id, reference, customer_id, operator_id, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (readError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (booking.status !== BOOKING_STATUS.completed) {
      return NextResponse.json(
        { error: "You can only review completed bookings" },
        { status: 400 },
      );
    }

    if (!booking.operator_id) {
      return NextResponse.json(
        { error: "This booking has no operator to review" },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from("booking_reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You have already reviewed this booking" },
        { status: 409 },
      );
    }

    const { data: review, error: insertError } = await supabase
      .from("booking_reviews")
      .insert({
        booking_id: bookingId,
        customer_id: user.id,
        operator_id: booking.operator_id,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
      })
      .select("id, rating, comment, created_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You have already reviewed this booking" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const admin = createServiceRoleClient();
    const { data: operator } = await admin
      .from("operators")
      .select("user_id")
      .eq("id", booking.operator_id)
      .maybeSingle();

    if (operator?.user_id) {
      const content = getNotificationContent("customer_review_received", {
        reference: booking.reference,
        rating: String(parsed.data.rating),
        has_comment: parsed.data.comment?.trim() ? "true" : "false",
      });
      await sendNotification({
        user_id: operator.user_id,
        type: "customer_review_received",
        title: content.title,
        message: content.message,
        booking_id: bookingId,
        metadata: {
          reference: booking.reference,
          rating: parsed.data.rating,
          review_id: review.id,
        },
      });
    }

    return NextResponse.json({ review });
  } catch (err) {
    console.error("booking review error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
