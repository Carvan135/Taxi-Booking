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

export function useProcessRefundMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      bookingId: string;
      amount: number;
      reason: string;
    }) => {
      const res = await fetch(
        `/api/admin/bookings/${input.bookingId}/refund`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: input.amount,
            reason: input.reason,
          }),
        },
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Could not process refund");
      }
      return body;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminBookingKeys.all });
    },
  });
}

export function useResendConfirmationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await fetch(
        `/api/bookings/${bookingId}/resend-confirmation`,
        { method: "POST" },
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Could not resend confirmation");
      }
      return body;
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
