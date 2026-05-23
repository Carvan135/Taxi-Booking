"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  markBookingComplete,
  releasePayoutEarly,
} from "@/lib/actions/adminBookings";
import { adminBookingKeys } from "./keys";

export function useMarkBookingCompleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const result = await markBookingComplete(bookingId);
      if (!result.success) {
        throw new Error(result.error ?? "Could not complete booking");
      }
      return bookingId;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminBookingKeys.all });
    },
  });
}

export function useReleasePayoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const result = await releasePayoutEarly(bookingId);
      if (!result.success) {
        throw new Error(result.error ?? "Could not release payout");
      }
      return bookingId;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminBookingKeys.all });
    },
  });
}
