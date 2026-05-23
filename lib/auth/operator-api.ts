import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export type OperatorAuthContext = {
  user: User;
  operator: { id: string; user_id: string };
};

export async function getOperatorForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string; user_id: string } | null> {
  const { data, error } = await supabase
    .from("operators")
    .select("id, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
