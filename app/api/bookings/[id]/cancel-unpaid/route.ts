import { NextResponse } from "next/server";
import { canCancelUnpaidBooking } from "@/lib/booking/booking-payment";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;
    const body = (await req.json().catch(() => ({}))) as {
      customer_email?: string;
    };

    const supabase = createServiceRoleClient();
    const { data: booking, error: readError } = await supabase
      .from("bookings")
      .select(
        "id, status, payment_status, customer_id, customer_email, journey_started_at, group_reference, stripe_payment_intent_id",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (readError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!canCancelUnpaidBooking(booking)) {
      return NextResponse.json(
        { error: "This booking cannot be cancelled" },
        { status: 400 },
      );
    }

    const authClient = createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const emailInput = body.customer_email?.trim().toLowerCase();
    const bookingEmail = booking.customer_email?.trim().toLowerCase() ?? "";

    if (user) {
      if (booking.customer_id && booking.customer_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!booking.customer_id) {
        return NextResponse.json(
          {
            error:
              "Sign in with the email used for this booking, or cancel via booking lookup.",
          },
          { status: 403 },
        );
      }
    } else {
      if (!emailInput || emailInput !== bookingEmail) {
        return NextResponse.json(
          { error: "Enter the email used when you started this booking" },
          { status: 403 },
        );
      }
    }

    if (user && booking.customer_id === user.id) {
      const userSupabase = authClient;
      const { error: cancelError } = await userSupabase.rpc(
        "customer_cancel_booking",
        { p_booking_id: bookingId },
      );
      if (cancelError) {
        console.error("cancel-unpaid customer rpc:", cancelError);
        return NextResponse.json(
          { error: "Could not cancel booking" },
          { status: 500 },
        );
      }
    } else {
      const { error: cancelError } = await supabase.rpc("cancel_unpaid_booking", {
        p_booking_id: bookingId,
        p_customer_email: emailInput ?? null,
      });
      if (cancelError) {
        console.error("cancel-unpaid rpc:", cancelError);
        return NextResponse.json(
          { error: "Could not cancel booking" },
          { status: 500 },
        );
      }
    }

    if (booking.stripe_payment_intent_id) {
      try {
        const { getStripeServer } = await import("@/lib/stripe/server");
        const stripe = getStripeServer();
        await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id);
      } catch {
        /* intent may already be canceled or succeeded */
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("cancel-unpaid error:", err);
    return NextResponse.json(
      { error: "Could not cancel booking" },
      { status: 500 },
    );
  }
}
