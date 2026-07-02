"use client";

import { useQuery } from "@tanstack/react-query";
import { normalizeBookingServiceType } from "@/lib/operator/fleet-vehicle-types";
import type { ServiceType } from "@/lib/validations/enums";
import type { OperatorListItem } from "@/types";
import { operatorKeys } from "./keys";

const DEFAULT_STALE_TIME = 1000 * 60;

export function useApprovedOperators(serviceType?: ServiceType) {
  const normalizedServiceType = serviceType
    ? normalizeBookingServiceType(serviceType)
    : undefined;

  return useQuery({
    queryKey: operatorKeys.approved(normalizedServiceType),
    queryFn: async (): Promise<OperatorListItem[]> => {
      const params = new URLSearchParams();
      if (normalizedServiceType) {
        params.set("service_type", normalizedServiceType);
      }

      const url = params.size
        ? `/api/booking/operators?${params.toString()}`
        : "/api/booking/operators";

      const res = await fetch(url);
      const body = (await res.json()) as {
        operators?: OperatorListItem[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(body.error ?? "Could not load operators");
      }

      return body.operators ?? [];
    },
    enabled: normalizedServiceType !== undefined,
    staleTime: DEFAULT_STALE_TIME,
  });
}
