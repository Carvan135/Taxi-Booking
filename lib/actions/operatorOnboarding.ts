"use server";

import { operatorApplicationSchema } from "@/lib/validations/operator";
import { formatZodError } from "@/lib/validations/utils";
import { OPERATOR_STATUS } from "@/lib/validations/enums";
import { createClient } from "@/lib/supabase/server";

export type SubmitOperatorApplicationInput = {
  business_name: string;
  vehicle_type: string;
  vehicle_registration: string;
  license_number: string;
  license_expiry: string;
  license_document_url: string;
  base_price: number;
};

export async function submitOperatorApplication(
  input: SubmitOperatorApplicationInput,
): Promise<{ success: boolean; error?: string }> {
  const parsed = operatorApplicationSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  const data = parsed.data;

  if (!input.license_document_url.trim()) {
    return { success: false, error: "License document is required." };
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

  if (profileError || profile?.role !== "operator") {
    return { success: false, error: "Operator access required." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("operators")
    .select("id, status")
    .eq("user_id", user.id)
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
    user_id: user.id,
    business_name: data.business_name,
    vehicle_type: data.vehicle_type,
    vehicle_registration: data.vehicle_registration,
    license_number: data.license_number,
    license_expiry: data.license_expiry,
    license_document_url: input.license_document_url.trim(),
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
