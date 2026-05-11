"use server";

import { redirect } from "next/navigation";
import {
  formatZodError,
  signInSchema,
  signUpSchema,
  type SignInFormData,
  type SignUpFormData,
} from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export async function signUp(
  data: SignUpFormData,
): Promise<{ success: boolean; error?: string }> {
  const parsed = signUpSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  const { email, password, full_name, phone, role } = parsed.data;
  const supabase = createClient();

  // Operators should be able to start onboarding immediately (no email confirmation gate).
  if (role === "operator") {
    const admin = createAdminClient();

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, name: full_name },
      });

    if (createError) {
      return { success: false, error: createError.message };
    }

    const createdUser = created.user;
    if (!createdUser) {
      return { success: false, error: "Could not create operator account." };
    }

    // Create a real session so the client can continue onboarding immediately.
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !signInData.session) {
      return {
        success: false,
        error:
          signInError?.message ??
          "Account created, but could not start a session. Try signing in.",
      };
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name,
        phone: phone?.trim() ? phone.trim() : null,
        role: "operator",
      })
      .eq("id", createdUser.id);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    return { success: true };
  }

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        name: full_name,
      },
    },
  });

  if (signUpError) {
    return { success: false, error: signUpError.message };
  }

  const user = authData.user;
  if (!user) {
    return {
      success: false,
      error: "Sign up did not return a user. Check email confirmation settings.",
    };
  }

  if (authData.session) {
    const desiredRole = role ?? "customer";
    const profilePatch = {
      full_name,
      phone: phone?.trim() ? phone.trim() : null,
      role: desiredRole,
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profilePatch)
      .eq("id", user.id);

    if (profileError) {
      return {
        success: false,
        error: profileError.message,
      };
    }
  }

  return { success: true };
}

export async function signIn(
  data: SignInFormData,
): Promise<{ success: boolean; error?: string; role?: UserRole }> {
  const parsed = signInSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  const supabase = createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { success: false, error: "Could not determine user after sign-in." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile?.role) {
    return {
      success: false,
      error: profileError?.message ?? "Could not load your profile.",
    };
  }

  return { success: true, role: profile.role as UserRole };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
