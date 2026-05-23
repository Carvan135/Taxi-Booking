"use server";

import { operatorApplicationSchema } from "@/lib/validations/operator";
import { formatZodError } from "@/lib/validations/utils";
import { OPERATOR_STATUS } from "@/lib/validations/enums";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type OperatorApplicationCore = {
  business_name: string;
  vehicle_type: string;
  vehicle_registration: string;
  license_number: string;
  license_expiry: string;
  base_price: number;
};

export type SubmitOperatorApplicationInput = OperatorApplicationCore & {
  license_document_url: string;
};

type UpsertOperatorOptions = {
  requireLicense?: boolean;
};

async function ensureOperatorProfileRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  if (profile?.role === "operator") {
    return { ok: true };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "operator" })
    .eq("id", userId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

export async function upsertOperatorApplicationForUser(
  supabase: SupabaseClient,
  userId: string,
  input: SubmitOperatorApplicationInput,
  options: UpsertOperatorOptions = {},
): Promise<{ success: boolean; error?: string }> {
  const requireLicense = options.requireLicense ?? true;
  const parsed = operatorApplicationSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  const data = parsed.data;
  const licenseUrl = input.license_document_url.trim();

  if (requireLicense && !licenseUrl) {
    return { success: false, error: "License document is required." };
  }

  const roleCheck = await ensureOperatorProfileRole(supabase, userId);
  if (!roleCheck.ok) {
    return { success: false, error: roleCheck.error };
  }

  const { data: existing, error: existingError } = await supabase
    .from("operators")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (
    existing &&
    existing.status !== OPERATOR_STATUS.pending &&
    existing.status !== OPERATOR_STATUS.rejected
  ) {
    return {
      success: false,
      error: "Your application has already been submitted.",
    };
  }

  const row = {
    user_id: userId,
    business_name: data.business_name,
    vehicle_type: data.vehicle_type,
    vehicle_registration: data.vehicle_registration,
    license_number: data.license_number,
    license_expiry: data.license_expiry,
    license_document_url: licenseUrl || null,
    base_price: data.base_price,
    status: OPERATOR_STATUS.pending,
  };

  const { error: operatorError } = existing
    ? await supabase.from("operators").update(row).eq("id", existing.id)
    : await supabase.from("operators").insert(row);

  if (operatorError) {
    return { success: false, error: operatorError.message };
  }

  return { success: true };
}

export async function submitOperatorApplication(
  input: SubmitOperatorApplicationInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = operatorApplicationSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: formatZodError(parsed.error) };
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    const metaRole = user.user_metadata?.role;
    if (profile?.role !== "operator" && metaRole !== "operator") {
      return { success: false, error: "Operator access required." };
    }

    return await upsertOperatorApplicationForUser(supabase, user.id, input);
  } catch (err) {
    console.error("submitOperatorApplication:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not submit your application. Please try again.",
    };
  }
}
