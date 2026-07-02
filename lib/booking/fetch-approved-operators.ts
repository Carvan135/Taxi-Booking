import { operatorMatchesServiceType } from "@/lib/operator/fleet-vehicle-types";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { OPERATOR_STATUS } from "@/lib/validations/enums";
import type { ServiceType } from "@/lib/validations/enums";
import type {
  OperatorBasePricingSummary,
  OperatorListItem,
} from "@/types";

type OperatorRow = OperatorListItem & {
  operator_base_pricing:
    | OperatorBasePricingSummary
    | OperatorBasePricingSummary[]
    | null;
};

function normalizePricing(
  raw: OperatorRow["operator_base_pricing"],
): OperatorBasePricingSummary | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

export async function fetchApprovedOperators(
  serviceType?: ServiceType,
): Promise<{ operators: OperatorListItem[]; error?: string }> {
  const supabase = tryCreateAdminClient();
  if (!supabase) {
    return {
      operators: [],
      error:
        "Operators are unavailable: SUPABASE_SERVICE_ROLE_KEY is not set on the server.",
    };
  }

  const { data, error } = await supabase
    .from("operators")
    .select(
      `
      *,
      operator_base_pricing ( base_fare, per_mile, per_minute )
    `,
    )
    .eq("status", OPERATOR_STATUS.approved)
    .eq("is_paused", false)
    .order("rating", { ascending: false });

  if (error) {
    console.error("fetchApprovedOperators:", error);
    return {
      operators: [],
      error: "Could not load operators",
    };
  }

  const rows = ((data ?? []) as OperatorRow[]).map((row) => {
    const { operator_base_pricing: pricingRaw, ...operator } = row;
    return {
      ...operator,
      operator_base_pricing: normalizePricing(pricingRaw),
    };
  });

  if (!serviceType) {
    return { operators: rows };
  }

  return {
    operators: rows.filter((operator) =>
      operatorMatchesServiceType(operator, serviceType),
    ),
  };
}
