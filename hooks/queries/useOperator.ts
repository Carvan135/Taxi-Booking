"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Operator } from "@/types";

const DEFAULT_STALE_TIME = 1000 * 60;

export type OperatorUpdate = Partial<
  Pick<
    Operator,
    | "business_name"
    | "vehicle_type"
    | "vehicle_registration"
    | "license_number"
    | "license_expiry"
    | "license_document_url"
    | "base_price"
    | "stripe_account_id"
    | "stripe_onboarding_complete"
  >
>;

export function useOperator(operatorId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["operator", operatorId ?? "me"],
    queryFn: async (): Promise<Operator | null> => {
      if (operatorId) {
        const { data, error } = await supabase
          .from("operators")
          .select("*")
          .eq("id", operatorId)
          .maybeSingle();

        if (error) throw error;
        return data as Operator | null;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("operators")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Operator | null;
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useOperators() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["operators"],
    queryFn: async (): Promise<Operator[]> => {
      const { data, error } = await supabase
        .from("operators")
        .select("*")
        .eq("status", "approved")
        .order("business_name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Operator[];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useUpdateOperator() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      operatorId,
      updates,
    }: {
      operatorId: string;
      updates: OperatorUpdate;
    }): Promise<Operator> => {
      const { data, error } = await supabase
        .from("operators")
        .update(updates)
        .eq("id", operatorId)
        .select()
        .single();

      if (error) throw error;
      return data as Operator;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["operators"] });
      void queryClient.invalidateQueries({
        queryKey: ["operator", variables.operatorId],
      });
      void queryClient.invalidateQueries({ queryKey: ["operator", "me"] });
    },
  });
}
