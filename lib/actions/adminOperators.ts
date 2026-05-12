"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

export async function updateOperatorApproval(
  operatorId: string,
  nextStatus: "approved" | "rejected",
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  await requireRole(supabase, ["admin"]);

  const { data: row, error: readErr } = await supabase
    .from("operators")
    .select("id, status")
    .eq("id", operatorId)
    .maybeSingle();

  if (readErr || !row) {
    return { success: false, error: readErr?.message ?? "Operator not found." };
  }

  if (row.status !== "pending") {
    return {
      success: false,
      error: "Only pending operators can be approved or rejected.",
    };
  }

  const { error } = await supabase
    .from("operators")
    .update({ status: nextStatus })
    .eq("id", operatorId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/operators");
  revalidatePath(`/admin/operators/${operatorId}`);
  return { success: true };
}

export async function setOperatorSuspended(
  operatorId: string,
  suspended: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  await requireRole(supabase, ["admin"]);

  const nextStatus = suspended ? "suspended" : "approved";

  const { data: row, error: readErr } = await supabase
    .from("operators")
    .select("id, status")
    .eq("id", operatorId)
    .maybeSingle();

  if (readErr || !row) {
    return { success: false, error: readErr?.message ?? "Operator not found." };
  }

  if (suspended && row.status !== "approved") {
    return {
      success: false,
      error: "Only approved operators can be suspended.",
    };
  }

  if (!suspended && row.status !== "suspended") {
    return {
      success: false,
      error: "Only suspended operators can be reactivated.",
    };
  }

  const { error } = await supabase
    .from("operators")
    .update({ status: nextStatus })
    .eq("id", operatorId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/operators");
  revalidatePath(`/admin/operators/${operatorId}`);
  return { success: true };
}
