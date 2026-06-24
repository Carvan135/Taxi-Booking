import { PRICE_RULE_TEMPLATES } from "@/lib/booking/price-rule-catalog";
import { resolveOperatorFleetTypes } from "@/lib/operator/fleet-vehicle-types";
import {
  operatorProfileFormSchema,
  type OperatorProfileFormValues,
} from "@/lib/validations/operatorProfile";
import type { OperatorStatus } from "@/types";

export type OperatorSetupStep = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  href?: string;
};

export type OperatorSetupEvaluation = {
  steps: OperatorSetupStep[];
  allComplete: boolean;
};

type OperatorRow = Record<string, unknown>;

export function isOperatorProfileComplete(
  operator: OperatorRow | null,
  profile: { email: string | null; phone: string | null } | null,
): boolean {
  if (!operator) return false;

  const fleetTypes = resolveOperatorFleetTypes({
    fleet_vehicle_types:
      operator.fleet_vehicle_types == null
        ? null
        : String(operator.fleet_vehicle_types),
    vehicle_type:
      operator.vehicle_type == null ? null : String(operator.vehicle_type),
  });

  const values: OperatorProfileFormValues = {
    business_name: String(operator.business_name ?? ""),
    vehicle_registration: String(operator.vehicle_registration ?? ""),
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
    business_address:
      operator.business_address == null
        ? ""
        : String(operator.business_address),
    business_description:
      operator.business_description == null
        ? ""
        : String(operator.business_description),
    fleet_vehicle_types: fleetTypes,
    license_number: String(operator.license_number ?? ""),
    license_expiry: String(operator.license_expiry ?? "").slice(0, 10),
    fleet_vehicle_count:
      operator.fleet_vehicle_count == null
        ? 1
        : Number(operator.fleet_vehicle_count),
  };

  return operatorProfileFormSchema.safeParse(values).success;
}

export function evaluateOperatorSetupSteps(input: {
  operator: OperatorRow | null;
  profile: { email: string | null; phone: string | null } | null;
  hasBasePricing: boolean;
  priceRuleCount: number;
}): OperatorSetupEvaluation {
  const { operator, profile, hasBasePricing, priceRuleCount } = input;
  const status = (operator?.status ?? "pending") as OperatorStatus;
  const profileComplete = isOperatorProfileComplete(operator, profile);
  const approved = status === "approved";
  const pricingReady =
    hasBasePricing && priceRuleCount >= PRICE_RULE_TEMPLATES.length;
  const stripeOnboarding =
    operator?.stripe_onboarding_complete === true;
  const payoutsEnabled = operator?.stripe_payouts_enabled === true;

  const approvalDetail = (() => {
    if (!operator) return "Submit your profile to start review.";
    if (status === "approved") return "You can accept bookings and set up payouts.";
    if (status === "pending") {
      return profileComplete
        ? "Under review — usually 24–48 hours."
        : "Complete your profile first, then we will review your application.";
    }
    if (status === "rejected") {
      return "Not approved. Contact support if you have questions.";
    }
    if (status === "suspended") {
      return "Account suspended. Contact support.";
    }
    return `Status: ${status}`;
  })();

  const pricingDetail = (() => {
    if (!approved) return "Available once your application is approved.";
    if (pricingReady) return "Base fare and surcharges are configured.";
    if (!hasBasePricing) {
      return "Set your base fare, per mile, and per minute rates.";
    }
    return "Review your surcharge rules (airport, weekend, out of hours).";
  })();

  const payoutDetail = (() => {
    if (!approved) return "Available once your application is approved.";
    if (payoutsEnabled) return "Bank payouts are enabled.";
    if (stripeOnboarding) {
      return "Stripe is verifying your details — often 1–2 business days.";
    }
    if (operator?.stripe_account_id) {
      return "Finish identity and bank details in Stripe.";
    }
    return "Connect Stripe to receive earnings from completed trips.";
  })();

  const steps: OperatorSetupStep[] = [
    {
      id: "profile",
      label: "Complete your profile",
      detail: profileComplete
        ? "Business and vehicle details are on file."
        : "Add business info, licence, and contact details.",
      done: profileComplete,
      href: "/operator/profile",
    },
    {
      id: "approval",
      label: "Application approved",
      detail: approvalDetail,
      done: approved,
      href: profileComplete ? undefined : "/operator/profile",
    },
    {
      id: "pricing",
      label: "Configure your rates",
      detail: pricingDetail,
      done: pricingReady,
      href: approved ? "/operator/price-rules" : undefined,
    },
    {
      id: "payouts",
      label: "Set up payouts",
      detail: payoutDetail,
      done: payoutsEnabled,
      href: approved ? "/operator/finances?tab=onboarding" : undefined,
    },
  ];

  return {
    steps,
    allComplete: steps.every((s) => s.done),
  };
}
