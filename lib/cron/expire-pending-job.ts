import type { SupabaseClient } from "@supabase/supabase-js";

export async function runExpirePendingBookingsCron(
  supabase: SupabaseClient,
): Promise<{ expired: number }> {
  const { data, error } = await supabase.rpc("expire_stale_pending_bookings", {
    p_max_age: "7 days",
  });

  if (error) {
    throw error;
  }

  return { expired: typeof data === "number" ? data : 0 };
}
