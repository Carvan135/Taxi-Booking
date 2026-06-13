"use server";

import { z } from "zod";
import { formatZodError } from "@/lib/validations";
import { signInSchema } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/server";

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/[0-9]/, "Password must include at least one number"),
});

export type PasswordResetResult = {
  success: boolean;
  error?: string;
};

/** @deprecated Use client-side supabase.auth.updateUser on /auth/reset-password */
export async function updatePasswordAfterReset(
  password: string,
): Promise<PasswordResetResult> {
  const parsed = resetPasswordSchema.safeParse({ password });
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "Your reset link has expired. Please request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
