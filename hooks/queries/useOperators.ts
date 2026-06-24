"use client";

import { useQuery } from "@tanstack/react-query";
import { operatorMatchesServiceType } from "@/lib/operator/fleet-vehicle-types";
import { OPERATOR_STATUS } from "@/lib/validations/enums";
import type { ServiceType } from "@/lib/validations/enums";
import { createClient } from "@/lib/supabase/client";
import type {
  OperatorBasePricingSummary,
  OperatorListItem,
} from "@/types";
import { operatorKeys } from "./keys";

const DEFAULT_STALE_TIME = 1000 * 60;

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

export function useApprovedOperators(serviceType?: ServiceType) {
  const supabase = createClient();

  return useQuery({
    queryKey: operatorKeys.approved(serviceType),
    queryFn: async (): Promise<OperatorListItem[]> => {
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

      if (error) throw error;

      const rows = ((data ?? []) as OperatorRow[]).map((row) => {
        const { operator_base_pricing: pricingRaw, ...operator } = row;
        return {
          ...operator,
          operator_base_pricing: normalizePricing(pricingRaw),
        };
      });

      if (!serviceType) return rows;

      return rows.filter((operator) =>
        operatorMatchesServiceType(operator, serviceType),
      );
    },
    enabled: serviceType !== undefined,
    staleTime: DEFAULT_STALE_TIME,
  });
}
