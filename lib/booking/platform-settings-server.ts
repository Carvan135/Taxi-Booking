import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

const DEFAULT_COMMISSION_PERCENT = 15;
const DEFAULT_PAYOUT_DELAY_HOURS = 24;
const DEFAULT_AUTO_COMPLETE_HOURS = 24;
const DEFAULT_AUTO_COMPLETE_WARNING_HOURS = 2;
const DEFAULT_CANCELLATION_CUTOFF_HOURS = 24;
const DEFAULT_CANCELLATION_FULL_REFUND_HOURS = 24;

async function getSettingValue(
  key: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const supabase = client ?? tryCreateAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.round(parsed);
}

export async function getPayoutDelayHours(
  client?: SupabaseClient,
): Promise<number> {
  const value = await getSettingValue("payout_delay_hours", client);
  return parsePositiveInt(value, DEFAULT_PAYOUT_DELAY_HOURS);
}

export async function getCommissionPercentage(
  client?: SupabaseClient,
): Promise<number> {
  const value = await getSettingValue("commission_percentage", client);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_COMMISSION_PERCENT;
  }
  return parsed;
}

export async function getAutoCompleteHours(
  client?: SupabaseClient,
): Promise<number> {
  const value = await getSettingValue("auto_complete_hours", client);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 168) {
    return DEFAULT_AUTO_COMPLETE_HOURS;
  }
  return Math.round(parsed);
}

export async function getAutoCompleteWarningHours(
  client?: SupabaseClient,
): Promise<number> {
  const value = await getSettingValue("auto_complete_warning_hours", client);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_AUTO_COMPLETE_WARNING_HOURS;
  }
  return Math.round(parsed);
}

export function addHours(isoBase: Date, hours: number): string {
  return new Date(
    isoBase.getTime() + hours * 60 * 60 * 1000,
  ).toISOString();
}

export async function getCancellationCutoffHours(
  client?: SupabaseClient,
): Promise<number> {
  const value = await getSettingValue("cancellation_cutoff_hours", client);
  return parsePositiveInt(value, DEFAULT_CANCELLATION_CUTOFF_HOURS);
}

export async function getCancellationFullRefundHours(
  client?: SupabaseClient,
): Promise<number> {
  const value = await getSettingValue("cancellation_full_refund_hours", client);
  return parsePositiveInt(value, DEFAULT_CANCELLATION_FULL_REFUND_HOURS);
}

export async function getPartialRefundEnabled(
  client?: SupabaseClient,
): Promise<boolean> {
  const value = await getSettingValue("partial_refund_enabled", client);
  if (value === undefined || value === null) return true;
  return value === "true";
}

const DEFAULT_SMS_REMINDER_HOURS = 2;

export async function getSmsRemindersEnabled(
  client?: SupabaseClient,
): Promise<boolean> {
  const value = await getSettingValue("sms_reminders_enabled", client);
  if (value === undefined || value === null) return true;
  return value === "true";
}

export async function getSmsReminderHoursBefore(
  client?: SupabaseClient,
): Promise<number> {
  const value = await getSettingValue("sms_reminder_hours_before", client);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 24) {
    return DEFAULT_SMS_REMINDER_HOURS;
  }
  return Math.round(parsed);
}

export type CancellationPolicySettings = {
  cutoffHours: number;
  fullRefundHours: number;
  partialRefundEnabled: boolean;
};

export async function getCancellationPolicySettings(
  client?: SupabaseClient,
): Promise<CancellationPolicySettings> {
  const [cutoffHours, fullRefundHours, partialRefundEnabled] = await Promise.all([
    getCancellationCutoffHours(client),
    getCancellationFullRefundHours(client),
    getPartialRefundEnabled(client),
  ]);
  return { cutoffHours, fullRefundHours, partialRefundEnabled };
}
