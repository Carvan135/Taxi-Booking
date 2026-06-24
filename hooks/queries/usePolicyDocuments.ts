"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { PolicyDocument } from "@/types";
import { policyDocumentKeys } from "./keys";

const DEFAULT_STALE_TIME = 1000 * 60;

export function usePolicyDocuments() {
  const supabase = createClient();

  return useQuery({
    queryKey: policyDocumentKeys.all,
    queryFn: async (): Promise<PolicyDocument[]> => {
      const { data, error } = await supabase
        .from("policy_documents")
        .select("*")
        .order("policy_type", { ascending: true });

      if (error) throw error;
      return (data ?? []) as PolicyDocument[];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}
