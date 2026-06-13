import { NextResponse } from "next/server";
import { z } from "zod";
import {
  emitBookingCreatedEmails,
  wasEmailSent,
} from "@/lib/email/booking-events";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reference: z.string().min(1),
  email: z.string().email().optional(),
});

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { reference, email } = parsed.data;
    const supabase = createServiceRoleClient();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, reference, customer_id, customer_email, payment_status")
      .eq("reference", reference)
      .maybeSingle();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Confirmation email is sent after payment" },
        { status: 400 },
      );
    }

    const authClient = createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (user) {
      if (booking.customer_id && booking.customer_id !== user.id) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
    } else if (booking.customer_id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 403 });
    } else if (email) {
      if (
        booking.customer_email.toLowerCase() !== email.toLowerCase()
      ) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: "Email required" }, { status: 403 });
    }

    await emitBookingCreatedEmails(supabase, reference);

    const sent = await wasEmailSent(
      supabase,
      booking.id,
      "booking_confirmation",
    );

    if (!sent) {
      return NextResponse.json(
        { error: "Email delivery failed" },
        { status: 503 },
      );
    }

    return NextResponse.json({ success: true, sent: true });
  } catch (err) {
    console.error("send-confirmation error:", err);
    return NextResponse.json(
      { error: "Could not send confirmation email" },
      { status: 500 },
    );
  }
}
