"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types";
import { notificationKeys } from "./keys";

const STALE_TIME = 1000 * 30;
const LIST_LIMIT = 20;

export function useNotifications() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    const channelRef: {
      current: ReturnType<typeof supabase.channel> | null;
    } = { current: null };

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const channelName = `notifications:${user.id}`;
      const topic = `realtime:${channelName}`;

      for (const existing of supabase.getChannels()) {
        if (existing.topic === topic) {
          await supabase.removeChannel(existing);
        }
      }

      if (cancelled) return;

      channelRef.current = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void queryClient.invalidateQueries({
              queryKey: notificationKeys.all,
            });
            void queryClient.invalidateQueries({
              queryKey: notificationKeys.unreadCount,
            });
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, queryClient]);

  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: async (): Promise<Notification[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT);

      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    staleTime: STALE_TIME,
  });
}

export function useUnreadCount() {
  const supabase = createClient();

  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async (): Promise<number> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "unread");

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: STALE_TIME,
  });
}

export function useMarkAsRead() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ status: "read", read_at: now })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount,
      });
    },
  });
}

export function useMarkAllAsRead() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ status: "read", read_at: now })
        .eq("user_id", user.id)
        .eq("status", "unread");

      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount,
      });
    },
  });
}
