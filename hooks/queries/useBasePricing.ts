"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  OperatorBasePricing,
  UpdateOperatorBasePricingInput,
} from "@/types";
import { basePricingKeys } from "./keys";

const DEFAULT_STALE_TIME = 1000 * 60;

export function useBasePricing(operatorId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: basePricingKeys.detail(operatorId),
    queryFn: async (): Promise<OperatorBasePricing | null> => {
      const { data, error } = await supabase
        .from("operator_base_pricing")
        .select("*")
        .eq("operator_id", operatorId)
        .maybeSingle();

      if (error) throw error;
      return data as OperatorBasePricing | null;
    },
    enabled: Boolean(operatorId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useUpdateBasePricing() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      operatorId,
      pricing,
    }: {
      operatorId: string;
      pricing: UpdateOperatorBasePricingInput;
    }): Promise<OperatorBasePricing> => {
      const { data, error } = await supabase
        .from("operator_base_pricing")
        .upsert(
          {
            operator_id: operatorId,
            ...pricing,
          },
          { onConflict: "operator_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return data as OperatorBasePricing;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: basePricingKeys.detail(data.operator_id),
      });
    },
  });
}
