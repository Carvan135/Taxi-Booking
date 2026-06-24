"use server";

import { revalidatePath } from "next/cache";
import {
  primaryFleetVehicleType,
  serializeFleetVehicleTypes,
} from "@/lib/operator/fleet-vehicle-types";
import { operatorProfileFormSchema } from "@/lib/validations/operatorProfile";
import { formatZodError } from "@/lib/validations/utils";
import { createClient } from "@/lib/supabase/server";

export async function updateOperatorProfile(
  input: unknown,
): Promise<{ success: boolean; error?: string }> {
  const parsed = operatorProfileFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }
  const data = parsed.data;

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: profile, error: profileReadError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError || profile?.role !== "operator") {
    return { success: false, error: "Operator access required." };
  }

  const { data: operator, error: opReadError } = await supabase
    .from("operators")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (opReadError || !operator) {
    return {
      success: false,
      error: "No operator profile found. Complete registration first.",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      email: data.email.trim(),
      phone: data.phone.trim(),
    })
    .eq("id", user.id);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  const { error: operatorError } = await supabase
    .from("operators")
    .update({
      business_name: data.business_name.trim(),
      vehicle_registration: data.vehicle_registration,
      vehicle_type: primaryFleetVehicleType(data.fleet_vehicle_types),
      fleet_vehicle_types: serializeFleetVehicleTypes(data.fleet_vehicle_types),
      license_number: data.license_number.trim(),
      license_expiry: data.license_expiry,
      business_address: data.business_address || null,
      business_description: data.business_description || null,
      fleet_vehicle_count: data.fleet_vehicle_count,
    })
    .eq("id", operator.id);

  if (operatorError) {
    return { success: false, error: operatorError.message };
  }

  revalidatePath("/operator/profile");
  revalidatePath("/operator/dashboard");
  return { success: true };
}
