"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { PlatformSetting, UpdatePlatformSettingInput } from "@/types";
import { platformSettingsKeys } from "./keys";

const DEFAULT_STALE_TIME = 1000 * 60;

export function usePlatformSettings() {
  const supabase = createClient();

  return useQuery({
    queryKey: platformSettingsKeys.all,
    queryFn: async (): Promise<PlatformSetting[]> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .order("key", { ascending: true });

      if (error) throw error;
      return (data ?? []) as PlatformSetting[];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useUpdatePlatformSetting() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
    }: UpdatePlatformSettingInput): Promise<PlatformSetting> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .update({ value })
        .eq("key", key)
        .select()
        .single();

      if (error) throw error;
      return data as PlatformSetting;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: platformSettingsKeys.all,
      });
    },
  });
}
