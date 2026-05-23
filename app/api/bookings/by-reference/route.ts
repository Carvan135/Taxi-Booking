import { NextResponse } from "next/server";
import { z } from "zod";
import { mapOperatorJoin } from "@/lib/booking/map-customer-booking-row";
import { OPERATOR_FOR_CUSTOMER_BOOKING_SELECT } from "@/lib/booking/operator-booking-select";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  ref: z.string().min(1),
  email: z.string().email().optional(),
});

const bookingSelect = `
  id,
  reference,
  group_reference,
  leg,
  booking_type,
  pickup_address,
  dropoff_address,
  pickup_date,
  pickup_time,
  return_date,
  return_time,
  passengers,
  service_type,
  price,
  status,
  payment_status,
  operator_id,
  created_at,
  customer_id,
  customer_email,
  customer_name,
  operators (
    ${OPERATOR_FOR_CUSTOMER_BOOKING_SELECT}
  )
`;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      ref: url.searchParams.get("ref")?.trim() ?? "",
      email: url.searchParams.get("email")?.trim() || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reference" }, { status: 400 });
    }

    const { ref, email } = parsed.data;
    const supabase = createServiceRoleClient();

    const { data: primary, error: primaryError } = await supabase
      .from("bookings")
      .select(bookingSelect)
      .eq("reference", ref)
      .maybeSingle();

    if (primaryError) {
      throw primaryError;
    }

    if (!primary) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const authClient = createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (user) {
      if (primary.customer_id && primary.customer_id !== user.id) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
    } else if (primary.customer_id) {
      return NextResponse.json(
        { error: "Sign in to view this booking" },
        { status: 403 },
      );
    } else if (email) {
      if (
        primary.customer_email.toLowerCase() !== email.toLowerCase()
      ) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
    } else {
      return NextResponse.json(
        { error: "Email is required to view this booking" },
        { status: 403 },
      );
    }

    let legs = [primary];

    if (primary.group_reference) {
      const { data: grouped, error: groupError } = await supabase
        .from("bookings")
        .select(bookingSelect)
        .eq("group_reference", primary.group_reference)
        .order("leg", { ascending: true });

      if (groupError) {
        throw groupError;
      }
      if (grouped && grouped.length > 0) {
        legs = grouped;
      }
    }

    const total_paid = legs.reduce(
      (sum, row) => sum + (Number(row.price) || 0),
      0,
    );

    const operator = mapOperatorJoin(
      primary.operators as Parameters<typeof mapOperatorJoin>[0],
    );

    return NextResponse.json({
      reference: primary.reference,
      group_reference: primary.group_reference,
      booking_type: primary.booking_type,
      total_paid: Math.round(total_paid * 100) / 100,
      customer_email: primary.customer_email,
      customer_name: primary.customer_name,
      is_guest: primary.customer_id === null,
      operator,
      legs: legs.map((row) => {
        const legOperator = mapOperatorJoin(
          row.operators as Parameters<typeof mapOperatorJoin>[0],
        );
        return {
          id: row.id,
          reference: row.reference,
          leg: row.leg,
          pickup_address: row.pickup_address,
          dropoff_address: row.dropoff_address,
          pickup_date: row.pickup_date,
          pickup_time: row.pickup_time,
          passengers: row.passengers,
          service_type: row.service_type,
          price: row.price,
          status: row.status,
          payment_status: row.payment_status,
          operator_id: row.operator_id,
          created_at: row.created_at,
          booking_type: row.booking_type,
          group_reference: row.group_reference,
          operator: legOperator,
        };
      }),
    });
  } catch (err) {
    console.error("bookings/by-reference error:", err);
    return NextResponse.json(
      { error: "Could not load booking" },
      { status: 500 },
    );
  }
}
