"use server";

import { changePasswordSchema } from "@/lib/validations/changePassword";
import { formatZodError } from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";

export type ChangePasswordResult = {
  success: boolean;
  error?: string;
};

export async function changePassword(
  input: unknown,
): Promise<ChangePasswordResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { success: false, error: "You must be signed in to change your password." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });

  if (verifyError) {
    return { success: false, error: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
