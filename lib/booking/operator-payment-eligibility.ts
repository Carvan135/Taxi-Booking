import type { SupabaseClient } from "@supabase/supabase-js";

export type OperatorPaymentEligibility = {
  id: string;
  vehicle_type: string;
  stripe_account_id: string | null;
  stripe_payouts_enabled: boolean;
  stripe_ready: boolean;
};

export async function getOperatorPaymentEligibility(
  supabase: SupabaseClient,
  operatorId: string,
): Promise<OperatorPaymentEligibility> {
  const { data: operator, error } = await supabase
    .from("operators")
    .select(
      "id, vehicle_type, status, is_paused, stripe_account_id, stripe_payouts_enabled",
    )
    .eq("id", operatorId)
    .maybeSingle();

  if (error || !operator) {
    throw new Error("Operator not found");
  }

  if (operator.status !== "approved") {
    throw new Error("Operator is not available for bookings");
  }

  if (operator.is_paused) {
    throw new Error("Operator is not accepting bookings right now");
  }

  const stripeAccountId = operator.stripe_account_id?.trim() || null;
  const payoutsEnabled = operator.stripe_payouts_enabled === true;

  if (stripeAccountId && !payoutsEnabled) {
    throw new Error("Operator payouts are not enabled");
  }

  return {
    id: operator.id,
    vehicle_type: operator.vehicle_type,
    stripe_account_id: stripeAccountId,
    stripe_payouts_enabled: payoutsEnabled,
    stripe_ready: Boolean(stripeAccountId && payoutsEnabled),
  };
}
