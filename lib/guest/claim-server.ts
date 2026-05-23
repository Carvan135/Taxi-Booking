import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ClaimBookingsResult =
  | { success: true; claimed: number }
  | { success: false; error: string; status: number };

/**
 * Links guest bookings (customer_id IS NULL) to the authenticated user by profile email.
 * Uses service role because RLS does not grant customer UPDATE on unclaimed rows.
 */
export async function claimBookingsForAuthenticatedUser(): Promise<ClaimBookingsResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("claimBookings profile error:", profileError);
    return {
      success: false,
      error: "Could not load your profile.",
      status: 500,
    };
  }

  const email = profile?.email?.trim();
  if (!email) {
    return {
      success: false,
      error: "No email on your profile.",
      status: 400,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookings")
    .update({ customer_id: user.id })
    .ilike("customer_email", email)
    .is("customer_id", null)
    .select("id");

  if (error) {
    console.error("claimBookings update error:", error);
    return {
      success: false,
      error: "Could not link bookings to your account.",
      status: 500,
    };
  }

  return { success: true, claimed: data?.length ?? 0 };
}
