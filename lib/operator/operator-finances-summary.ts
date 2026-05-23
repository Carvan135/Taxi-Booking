import type { SupabaseClient } from "@supabase/supabase-js";
import { BOOKING_STATUS, UPCOMING_BOOKING_STATUSES } from "@/lib/validations/enums";
import {
  getOperatorAvailableEarnings,
  type OperatorAvailableEarnings,
} from "@/lib/operator/release-operator-earnings";

type PayoutRow = { operator_payout: number | null };

function sumPayout(rows: PayoutRow[]): number {
  let total = 0;
  for (const r of rows) {
    total += Number(r.operator_payout ?? 0);
  }
  return Math.round(total * 100) / 100;
}

export type OperatorFuturePayments = {
  totalAmount: number;
  activeAmount: number;
  clearingAmount: number;
  activeCount: number;
  clearingCount: number;
};

export type OperatorFinancesSummary = {
  available: OperatorAvailableEarnings;
  future: OperatorFuturePayments;
  earningsToDate: number;
  earningsToDateCount: number;
};

/** Completed trips still inside the payout waiting period. */
export async function getOperatorFuturePayments(
  supabase: SupabaseClient,
  operatorId: string,
): Promise<OperatorFuturePayments> {
  const nowIso = new Date().toISOString();

  const { data: activeRows, error: activeError } = await supabase
    .from("bookings")
    .select("operator_payout")
    .eq("operator_id", operatorId)
    .in("status", [...UPCOMING_BOOKING_STATUSES])
    .eq("payment_status", "paid");

  if (activeError) {
    console.error("getOperatorFuturePayments active:", activeError);
  }

  const { data: clearingRows, error: clearingError } = await supabase
    .from("bookings")
    .select("operator_payout")
    .eq("operator_id", operatorId)
    .eq("status", BOOKING_STATUS.completed)
    .is("payout_released_at", null)
    .or(`payout_eligible_at.is.null,payout_eligible_at.gt.${nowIso}`);

  if (clearingError) {
    console.error("getOperatorFuturePayments clearing:", clearingError);
  }

  const active = (activeRows ?? []) as PayoutRow[];
  const clearing = (clearingRows ?? []) as PayoutRow[];
  const activeAmount = sumPayout(active);
  const clearingAmount = sumPayout(clearing);

  return {
    totalAmount: Math.round((activeAmount + clearingAmount) * 100) / 100,
    activeAmount,
    clearingAmount,
    activeCount: active.length,
    clearingCount: clearing.length,
  };
}

/** Lifetime operator earnings from all completed trips. */
export async function getOperatorEarningsToDate(
  supabase: SupabaseClient,
  operatorId: string,
): Promise<{ totalAmount: number; count: number }> {
  const { data: rows, error } = await supabase
    .from("bookings")
    .select("operator_payout")
    .eq("operator_id", operatorId)
    .eq("status", BOOKING_STATUS.completed);

  if (error) {
    console.error("getOperatorEarningsToDate:", error);
    return { totalAmount: 0, count: 0 };
  }

  const list = (rows ?? []) as PayoutRow[];
  return { totalAmount: sumPayout(list), count: list.length };
}

export async function getOperatorFinancesSummary(
  supabase: SupabaseClient,
  operatorId: string,
): Promise<OperatorFinancesSummary> {
  const [available, future, lifetime] = await Promise.all([
    getOperatorAvailableEarnings(supabase, operatorId),
    getOperatorFuturePayments(supabase, operatorId),
    getOperatorEarningsToDate(supabase, operatorId),
  ]);

  return {
    available,
    future,
    earningsToDate: lifetime.totalAmount,
    earningsToDateCount: lifetime.count,
  };
}
