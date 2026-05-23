"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Booking } from "@/types";
import { bookingKeys } from "./keys";

export type { CustomerBookingRow } from "@/types";

const DEFAULT_STALE_TIME = 1000 * 60;

export { useMyBookings } from "./useBooking";

export function useCancelMyBooking() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.rpc("customer_cancel_booking", {
        p_booking_id: bookingId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.customer });
    },
  });
}

export function useOperatorBookings() {
  const supabase = createClient();

  return useQuery({
    queryKey: bookingKeys.operator,
    queryFn: async (): Promise<Booking[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: operatorRow, error: opError } = await supabase
        .from("operators")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (opError) throw opError;
      if (!operatorRow) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("operator_id", operatorRow.id)
        .order("pickup_date", { ascending: false })
        .order("pickup_time", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Booking[];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}
