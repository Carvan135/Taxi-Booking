import { NextResponse } from "next/server";
import { z } from "zod";
import { generateReceiptBuffer } from "@/lib/pdf/generateReceipt";
import { loadReceiptBookingById } from "@/lib/pdf/load-receipt-booking";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  email: z.string().email().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      email: url.searchParams.get("email")?.trim() || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { email } = parsed.data;
    const supabase = createServiceRoleClient();

    const { data: accessRow, error: accessError } = await supabase
      .from("bookings")
      .select("id, reference, customer_id, customer_email, payment_status")
      .eq("id", bookingId)
      .maybeSingle();

    if (accessError || !accessRow) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (accessRow.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Receipt is available after payment" },
        { status: 400 },
      );
    }

    const authClient = createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (user) {
      if (accessRow.customer_id && accessRow.customer_id !== user.id) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
    } else if (accessRow.customer_id) {
      return NextResponse.json(
        { error: "Sign in to download this receipt" },
        { status: 403 },
      );
    } else if (email) {
      if (
        accessRow.customer_email.toLowerCase() !== email.toLowerCase()
      ) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
    } else {
      return NextResponse.json(
        { error: "Email is required to download this receipt" },
        { status: 403 },
      );
    }

    const receiptBooking = await loadReceiptBookingById(supabase, bookingId);
    if (!receiptBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const pdfBuffer = await generateReceiptBuffer(receiptBooking);
    const filename = `receipt-${accessRow.reference}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("bookings/[id]/receipt error:", err);
    return NextResponse.json(
      { error: "Could not generate receipt" },
      { status: 500 },
    );
  }
}
