"use server";

import { claimBookingsForAuthenticatedUser } from "@/lib/guest/claim-server";
import { signUp } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import type { SignUpFormData } from "@/lib/validations";

/** @deprecated Prefer POST /api/auth/claim-bookings from the client. */
export async function claimGuestBookingsByEmail(): Promise<{
  success: boolean;
  error?: string;
  claimed?: number;
}> {
  const result = await claimBookingsForAuthenticatedUser();
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, claimed: result.claimed };
}

/** @deprecated Prefer guestSignUpAndClaimBookingsClient from @/lib/guest/account. */
export async function guestSignUpAndClaimBookings(
  input: Pick<SignUpFormData, "email" | "password" | "full_name">,
): Promise<{ success: boolean; error?: string }> {
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

  const claim = await claimBookingsForAuthenticatedUser();
  if (!claim.success) {
    return { success: false, error: claim.error };
  }

  return { success: true };
}
