import type { SupabaseClient } from "@supabase/supabase-js";
import { getNotificationContent } from "@/lib/notifications/messages";
import { sendNotification } from "@/lib/notifications/send";
import { BOOKING_STATUS } from "@/lib/validations/enums";
import { canReceivePayout } from "@/lib/stripe/payoutGuard";

export type EligiblePayoutBooking = {
  id: string;
  reference: string;
  operator_payout: number | null;
};

export type OperatorAvailableEarnings = {
  count: number;
  totalAmount: number;
  bookings: EligiblePayoutBooking[];
};

export type ReleaseOperatorEarningsResult = {
  success: boolean;
  released: number;
  totalAmount: number;
  error?: string;
};

function bookingPayoutAmount(row: EligiblePayoutBooking): number {
  return Number(row.operator_payout ?? 0);
}

export async function getOperatorAvailableEarnings(
  supabase: SupabaseClient,
  operatorId: string,
): Promise<OperatorAvailableEarnings> {
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from("bookings")
    .select("id, reference, operator_payout")
    .eq("operator_id", operatorId)
    .eq("status", BOOKING_STATUS.completed)
    .is("payout_released_at", null)
    .not("payout_eligible_at", "is", null)
    .lte("payout_eligible_at", nowIso);

  if (error) {
    console.error("getOperatorAvailableEarnings:", error);
    return { count: 0, totalAmount: 0, bookings: [] };
  }

  const bookings = (rows ?? []) as EligiblePayoutBooking[];
  let totalAmount = 0;
  for (const b of bookings) {
    totalAmount += bookingPayoutAmount(b);
  }

  return {
    count: bookings.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    bookings,
  };
}

export async function releaseEligiblePayoutsForOperator(
  supabase: SupabaseClient,
  operatorId: string,
): Promise<ReleaseOperatorEarningsResult> {
  const guard = await canReceivePayout(operatorId);
  if (!guard.allowed) {
    return {
      success: false,
      released: 0,
      totalAmount: 0,
      error: guard.reason ?? "Payouts are not available for your account yet.",
    };
  }

  const available = await getOperatorAvailableEarnings(supabase, operatorId);
  if (available.count === 0) {
    return {
      success: false,
      released: 0,
      totalAmount: 0,
      error: "No earnings are available to withdraw yet.",
    };
  }

  const nowIso = new Date().toISOString();
  const ids = available.bookings.map((b) => b.id);

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      payout_released_at: nowIso,
      updated_at: nowIso,
    })
    .in("id", ids);

  if (updateError) {
    return {
      success: false,
      released: 0,
      totalAmount: 0,
      error: updateError.message,
    };
  }

  const { data: op } = await supabase
    .from("operators")
    .select("user_id")
    .eq("id", operatorId)
    .maybeSingle();

  if (op?.user_id) {
    const amountStr = `£${available.totalAmount.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    const content = getNotificationContent("payout_released", {
      reference: `${available.count} booking${available.count === 1 ? "" : "s"}`,
      amount: amountStr,
    });
    await sendNotification({
      user_id: op.user_id,
      type: "payout_released",
      title: "Earnings withdrawn",
      message: `${amountStr} from ${available.count} completed trip${available.count === 1 ? "" : "s"} is now being processed. ${content.message}`,
      metadata: {
        released_count: available.count,
        total_amount: available.totalAmount,
      },
    });
  }

  return {
    success: true,
    released: available.count,
    totalAmount: available.totalAmount,
  };
}
