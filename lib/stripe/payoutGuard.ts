import { createServiceRoleClient } from "@/lib/supabase/server";

export async function canReceivePayout(operatorId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const supabase = createServiceRoleClient();

  const { data: operator, error } = await supabase
    .from("operators")
    .select("stripe_payouts_enabled, stripe_onboarding_complete, status")
    .eq("id", operatorId)
    .maybeSingle();

  if (error || !operator) {
    return { allowed: false, reason: "Operator not found" };
  }

  if (operator.status !== "approved") {
    return { allowed: false, reason: "Operator account not approved" };
  }

  if (!operator.stripe_onboarding_complete) {
    return { allowed: false, reason: "Stripe onboarding not completed" };
  }

  if (!operator.stripe_payouts_enabled) {
    return {
      allowed: false,
      reason: "Stripe payouts not yet enabled — verification pending",
    };
  }

  return { allowed: true };
}
