"use server";

import { revalidatePath } from "next/cache";
import { getPayoutDelayHours } from "@/lib/booking/platform-settings-server";
import { releasePayoutForBooking } from "@/lib/cron/auto-complete-job";
import { requireRole } from "@/lib/auth/helpers";
import { BOOKING_STATUS, COMPLETION_STATUS } from "@/lib/validations/enums";
import { createClient } from "@/lib/supabase/server";

export async function markBookingComplete(
  bookingId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  await requireRole(supabase, ["admin"]);

  const { data: booking, error: readErr } = await supabase
    .from("bookings")
    .select("id, status, operator_id, completion_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (readErr || !booking) {
    return { success: false, error: readErr?.message ?? "Booking not found." };
  }

  if (booking.status !== BOOKING_STATUS.confirmed || !booking.operator_id) {
    return {
      success: false,
      error: "Only confirmed bookings with an operator can be marked complete.",
    };
  }

  const delayHours = await getPayoutDelayHours(supabase);
  const now = new Date();
  const completedAt = now.toISOString();
  const payoutEligibleAt = new Date(
    now.getTime() + delayHours * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS.completed,
      completion_status: COMPLETION_STATUS.customer_confirmed,
      completed_at: completedAt,
      customer_confirmed_at: completedAt,
      payout_eligible_at: payoutEligibleAt,
      auto_complete_at: null,
      updated_at: completedAt,
    })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}

export async function releasePayoutEarly(
  bookingId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  await requireRole(supabase, ["admin"]);

  const result = await releasePayoutForBooking(supabase, bookingId);

  if (!result.success) {
    return result;
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}
