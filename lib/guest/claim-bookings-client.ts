"use client";

import type { QueryClient } from "@tanstack/react-query";
import { bookingKeys } from "@/hooks/queries/keys";
import { guestSession } from "@/lib/guest/session";

export type ClaimBookingsClientResult =
  | { success: true; claimed: number }
  | { success: false; error: string };

export function shouldClaimBookingsAfterAuth(
  redirectPath: string | null,
): boolean {
  if (!redirectPath) return false;
  return (
    redirectPath.startsWith("/payment") ||
    redirectPath.startsWith("/confirmation") ||
    redirectPath === "/bookings"
  );
}

/**
 * Claims guest bookings for the current session, clears guest session storage,
 * and invalidates the customer bookings query cache.
 */
export async function claimGuestBookings(
  queryClient?: QueryClient,
): Promise<ClaimBookingsClientResult> {
  try {
    const res = await fetch("/api/auth/claim-bookings", {
      method: "POST",
      credentials: "include",
    });

    const body = (await res.json()) as { claimed?: number; error?: string };

    if (!res.ok) {
      return {
        success: false,
        error: body.error ?? "Could not claim your bookings.",
      };
    }

    guestSession.clear();

    if (queryClient) {
      await queryClient.invalidateQueries({
        queryKey: bookingKeys.customer,
      });
    }

    return { success: true, claimed: body.claimed ?? 0 };
  } catch {
    return {
      success: false,
      error: "Could not claim your bookings. Please try again.",
    };
  }
}
