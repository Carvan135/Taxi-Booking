"use client";

import { useQuery } from "@tanstack/react-query";
import { OPERATOR_STATUS } from "@/lib/validations/enums";
import type { ServiceType } from "@/lib/validations/enums";
import { createClient } from "@/lib/supabase/client";
import type {
  OperatorBasePricingSummary,
  OperatorListItem,
  VehicleType,
} from "@/types";
import { operatorKeys } from "./keys";

const DEFAULT_STALE_TIME = 1000 * 60;

const SERVICE_TYPE_TO_VEHICLE_TYPE: Record<ServiceType, VehicleType> = {
  standard: "Sedan",
  executive: "Executive",
  van: "Van",
  suv: "SUV",
};

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
      let query = supabase
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

      if (serviceType) {
        query = query.eq(
          "vehicle_type",
          SERVICE_TYPE_TO_VEHICLE_TYPE[serviceType],
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return ((data ?? []) as OperatorRow[]).map((row) => {
        const { operator_base_pricing: pricingRaw, ...operator } = row;
        return {
          ...operator,
          operator_base_pricing: normalizePricing(pricingRaw),
        };
      });
    },
    enabled: serviceType !== undefined,
    staleTime: DEFAULT_STALE_TIME,
  });
}
