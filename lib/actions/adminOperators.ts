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

  const { error } = await supabase
    .from("operators")
    .update({ status: nextStatus })
    .eq("id", operatorId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/operators");
  return { success: true };
}
