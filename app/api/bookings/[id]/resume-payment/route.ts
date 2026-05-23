import { NextResponse } from "next/server";
import { canResumeBookingPayment } from "@/lib/booking/booking-payment";
import { getOperatorPaymentEligibility } from "@/lib/booking/operator-payment-eligibility";
import { createPaymentIntentForBookingTotal } from "@/lib/stripe/create-payment-intent";
import {
  isPaymentIntentReusable,
  paymentIntentAmountMatches,
} from "@/lib/stripe/payment-intent-utils";
import { getStripeServer } from "@/lib/stripe/server";
import {
  BOOKING_STATUS,
  PAYMENT_STATUSES,
} from "@/lib/validations/enums";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const PAYMENT_UNPAID = PAYMENT_STATUSES[0];
const PAYMENT_FAILED = PAYMENT_STATUSES[3];

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
        "id, reference, operator_id, booking_type, status, payment_status, stripe_payment_intent_id, group_reference, price, platform_commission, operator_payout, customer_id, customer_email",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (readError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!canResumeBookingPayment(booking)) {
      return NextResponse.json(
        { error: "This booking does not require payment" },
        { status: 400 },
      );
    }

    try {
      await getOperatorPaymentEligibility(supabase, booking.operator_id!);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Operator unavailable";
      return NextResponse.json({ error: message }, { status: 400 });
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
    } else {
      if (!emailInput || emailInput !== bookingEmail) {
        return NextResponse.json(
          { error: "Enter the email used when you started this booking" },
          { status: 403 },
        );
      }
    }

    let relatedQuery = supabase
      .from("bookings")
      .select(
        "id, price, platform_commission, operator_payout, booking_type, leg",
      )
      .eq("status", BOOKING_STATUS.pending)
      .in("payment_status", [PAYMENT_UNPAID, PAYMENT_FAILED]);

    if (booking.group_reference) {
      relatedQuery = relatedQuery.eq(
        "group_reference",
        booking.group_reference,
      );
    } else if (booking.stripe_payment_intent_id) {
      relatedQuery = relatedQuery.eq(
        "stripe_payment_intent_id",
        booking.stripe_payment_intent_id,
      );
    } else {
      relatedQuery = relatedQuery.eq("id", booking.id);
    }

    const { data: relatedRows, error: relatedError } = await relatedQuery;
    if (relatedError || !relatedRows?.length) {
      return NextResponse.json(
        { error: "Could not load booking payment details" },
        { status: 500 },
      );
    }

    const totalPrice = relatedRows.reduce(
      (sum, r) => sum + Number(r.price ?? 0),
      0,
    );
    const totalPlatform = relatedRows.reduce(
      (sum, r) => sum + Number(r.platform_commission ?? 0),
      0,
    );
    const totalOperator = relatedRows.reduce(
      (sum, r) => sum + Number(r.operator_payout ?? 0),
      0,
    );

    const stripe = getStripeServer();
    const existingPiId = booking.stripe_payment_intent_id?.trim();
    let setup: Awaited<ReturnType<typeof createPaymentIntentForBookingTotal>> | null =
      null;
    let reused = false;

    if (existingPiId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(existingPiId);
        if (
          isPaymentIntentReusable(existing.status) &&
          paymentIntentAmountMatches(existing, totalPrice) &&
          existing.client_secret
        ) {
          const operator = await getOperatorPaymentEligibility(
            supabase,
            booking.operator_id!,
          );
          setup = {
            client_secret: existing.client_secret,
            payment_intent_id: existing.id,
            platform_fee: totalPlatform,
            operator_payout: totalOperator,
            total: totalPrice,
            commission_percentage:
              totalPrice > 0 ? (totalPlatform / totalPrice) * 100 : 0,
            stripe_ready: operator.stripe_ready,
            quote: {
              legs: [],
              operator_subtotal: totalOperator,
              platform_fee: totalPlatform,
              platform_fee_percent:
                totalPrice > 0 ? (totalPlatform / totalPrice) * 100 : 0,
              total: totalPrice,
            },
            paymentIntent: existing,
          };
          reused = true;
        }
      } catch {
        /* create new below */
      }
    }

    if (!setup) {
      setup = await createPaymentIntentForBookingTotal(
        supabase,
        booking.operator_id!,
        booking.booking_type,
        totalPrice,
        totalPlatform,
        totalOperator,
      );

      const ids = relatedRows.map((r) => r.id);
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          stripe_payment_intent_id: setup.payment_intent_id,
          payment_status: PAYMENT_UNPAID,
          stripe_payment_status: PAYMENT_UNPAID,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);

      if (updateError) {
        return NextResponse.json(
          { error: "Could not start payment session" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      client_secret: setup.client_secret,
      payment_intent_id: setup.payment_intent_id,
      platform_fee: setup.platform_fee,
      operator_payout: setup.operator_payout,
      total: setup.total,
      commission_percentage: setup.commission_percentage,
      stripe_ready: setup.stripe_ready,
      quote: setup.quote,
      booking_reference: booking.reference,
      booking_id: booking.id,
      reused,
    });
  } catch (err) {
    console.error("resume-payment error:", err);
    return NextResponse.json(
      { error: "Could not resume payment" },
      { status: 500 },
    );
  }
}
