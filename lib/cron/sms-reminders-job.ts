import type { SupabaseClient } from "@supabase/supabase-js";
import { getUkPickupDateTimeInstant } from "@/lib/booking/uk-pickup-time";
import { sendSMS } from "@/lib/sms/send";
import { pickupReminderSMS } from "@/lib/sms/templates";

const DEFAULT_SMS_REMINDER_HOURS = 2;

type ReminderBookingRow = {
  id: string;
  reference: string;
  status: string;
  pickup_date: string;
  pickup_time: string;
  pickup_address: string;
  customer_name: string | null;
  customer_phone: string | null;
  operators:
    | { business_name: string }
    | { business_name: string }[]
    | null;
};

export type SmsRemindersCronResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: boolean;
};

async function getPlatformSetting(
  supabase: SupabaseClient,
  key: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

function parseReminderHours(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 24) {
    return DEFAULT_SMS_REMINDER_HOURS;
  }
  return Math.round(parsed);
}

function isPickupInReminderWindow(
  pickupDate: string,
  pickupTime: string,
  hoursBefore: number,
  now: Date,
): boolean {
  const pickupInstant = getUkPickupDateTimeInstant(pickupDate, pickupTime);
  if (!pickupInstant) return false;

  const windowEnd = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);
  const pickupMs = pickupInstant.getTime();
  const nowMs = now.getTime();
  const endMs = windowEnd.getTime();

  return pickupMs >= nowMs && pickupMs <= endMs;
}

function operatorName(
  operators: ReminderBookingRow["operators"],
): string {
  const row = Array.isArray(operators) ? operators[0] : operators;
  return row?.business_name?.trim() || "Your driver";
}

export async function sendPickupReminderForBooking(
  booking: ReminderBookingRow,
): Promise<{ success: boolean; error?: string }> {
  const phone = booking.customer_phone?.trim();
  if (!phone) {
    return { success: false, error: "No customer phone number" };
  }

  const message = pickupReminderSMS({
    customerName: booking.customer_name?.trim() || "Guest",
    pickupTime: String(booking.pickup_time),
    pickupAddress: booking.pickup_address,
    operatorName: operatorName(booking.operators),
    reference: booking.reference,
  });

  return sendSMS({
    to: phone,
    message,
    booking_id: booking.id,
  });
}

export async function runSmsRemindersCron(
  supabase: SupabaseClient,
): Promise<SmsRemindersCronResult> {
  const [enabledRaw, hoursRaw] = await Promise.all([
    getPlatformSetting(supabase, "sms_reminders_enabled"),
    getPlatformSetting(supabase, "sms_reminder_hours_before"),
  ]);

  if (enabledRaw === "false") {
    return { processed: 0, sent: 0, failed: 0, skipped: true };
  }

  const hoursBefore = parseReminderHours(hoursRaw);
  const now = new Date();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      reference,
      status,
      pickup_date,
      pickup_time,
      pickup_address,
      customer_name,
      customer_phone,
      operators!bookings_operator_id_fkey ( business_name )
    `,
    )
    .eq("status", "confirmed")
    .is("sms_reminder_sent_at", null)
    .not("customer_phone", "is", null);

  if (error) {
    throw error;
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const row of (bookings ?? []) as ReminderBookingRow[]) {
    if (row.status !== "confirmed") continue;
    if (
      !isPickupInReminderWindow(
        row.pickup_date,
        String(row.pickup_time),
        hoursBefore,
        now,
      )
    ) {
      continue;
    }

    processed += 1;
    const result = await sendPickupReminderForBooking(row);
    if (result.success) {
      sent += 1;
    } else {
      failed += 1;
    }

    const { error: markError } = await supabase
      .from("bookings")
      .update({ sms_reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("sms_reminder_sent_at", null);

    if (markError) {
      console.error("sms_reminder_sent_at update failed:", row.id, markError);
    }
  }

  return { processed, sent, failed, skipped: false };
}
