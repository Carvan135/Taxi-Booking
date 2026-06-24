import { NextResponse } from "next/server";
import { getProfile, getUser } from "@/lib/auth/helpers";
import { sendPickupReminderForBooking } from "@/lib/cron/sms-reminders-job";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
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

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        reference,
        status,
        pickup_date,
        pickup_time,
        pickup_address,
        customer_name,
        customer_phone,
        operators!bookings_operator_id_fkey ( business_name )
      `,
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed bookings can receive SMS reminders" },
        { status: 400 },
      );
    }

    const result = await sendPickupReminderForBooking(booking);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to send SMS reminder" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("admin/resend-sms-reminder error:", err);
    return NextResponse.json(
      { error: "Could not send SMS reminder" },
      { status: 500 },
    );
  }
}
