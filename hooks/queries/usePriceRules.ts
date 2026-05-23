"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  CreatePriceRuleInput,
  PriceRule,
  UpdatePriceRuleInput,
} from "@/types";
import { priceRuleKeys } from "./keys";

const DEFAULT_STALE_TIME = 1000 * 60;

export function usePriceRules(operatorId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: priceRuleKeys.list(operatorId),
    queryFn: async (): Promise<PriceRule[]> => {
      const { data, error } = await supabase
        .from("price_rules")
        .select("*")
        .eq("operator_id", operatorId)
        .order("rule_key", { ascending: true });

      if (error) throw error;
      return (data ?? []) as PriceRule[];
    },
    enabled: Boolean(operatorId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useCreatePriceRule() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePriceRuleInput): Promise<PriceRule> => {
      const { data, error } = await supabase
        .from("price_rules")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as PriceRule;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: priceRuleKeys.list(data.operator_id),
      });
    },
  });
}

export function useUpdatePriceRule() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      operatorId,
      updates,
    }: {
      id: string;
      operatorId: string;
      updates: UpdatePriceRuleInput;
    }): Promise<PriceRule> => {
      const { data, error } = await supabase
        .from("price_rules")
        .update(updates)
        .eq("id", id)
        .eq("operator_id", operatorId)
        .select()
        .single();

      if (error) throw error;
      return data as PriceRule;
    },
    onMutate: async ({ id, operatorId, updates }) => {
      await queryClient.cancelQueries({
        queryKey: priceRuleKeys.list(operatorId),
      });
      const previous = queryClient.getQueryData<PriceRule[]>(
        priceRuleKeys.list(operatorId),
      );
      queryClient.setQueryData<PriceRule[]>(
        priceRuleKeys.list(operatorId),
        (old) =>
          old?.map((rule) =>
            rule.id === id ? { ...rule, ...updates } : rule,
          ),
      );
      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          priceRuleKeys.list(variables.operatorId),
          context.previous,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: priceRuleKeys.list(variables.operatorId),
      });
    },
  });
}

export function useDeletePriceRule() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      operatorId,
    }: {
      id: string;
      operatorId: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from("price_rules")
        .delete()
        .eq("id", id)
        .eq("operator_id", operatorId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: priceRuleKeys.list(variables.operatorId),
      });
    },
  });
}
