import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

const DEFAULT_COMMISSION_PERCENT = 10;
const DEFAULT_PAYOUT_DELAY_HOURS = 24;
const DEFAULT_AUTO_COMPLETE_HOURS = 24;
const DEFAULT_AUTO_COMPLETE_WARNING_HOURS = 2;

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
  return new Date(isoBase.getTime() + hours * 60 * 60 * 1000).toISOString();
}
