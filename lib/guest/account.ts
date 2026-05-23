"use client";

import type { QueryClient } from "@tanstack/react-query";
import { signUp } from "@/lib/auth/actions";
import { claimGuestBookings } from "@/lib/guest/claim-bookings-client";
import { createClient } from "@/lib/supabase/client";

export async function guestSignUpAndClaimBookingsClient(
  input: {
    email: string;
    password: string;
    full_name: string;
  },
  queryClient?: QueryClient,
): Promise<{ success: boolean; error?: string; claimed?: number }> {
  const signUpResult = await signUp({
    email: input.email,
    password: input.password,
    full_name: input.full_name,
    phone: undefined,
    role: "customer",
  });

  if (!signUpResult.success) {
    return signUpResult;
  }

  const supabase = createClient();
  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (signInError) {
      return {
        success: false,
        error:
          "Account created. Please check your email to confirm, then sign in to link your booking.",
      };
    }
    ({
      data: { user },
    } = await supabase.auth.getUser());
  }

  if (!user) {
    return {
      success: false,
      error: "Account created but session could not be started. Please sign in.",
    };
  }

  const claim = await claimGuestBookings(queryClient);
  if (!claim.success) {
    return { success: false, error: claim.error };
  }

  return { success: true, claimed: claim.claimed };
}
