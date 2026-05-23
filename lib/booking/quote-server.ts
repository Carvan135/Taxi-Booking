import {
  buildTripQuoteContext,
  calculateBookingQuote,
  type BookingQuote,
  type OperatorPricingInput,
  type PriceRuleInput,
  type TripQuoteContext,
} from "@/lib/booking/quote";
import type { BookingRoute } from "@/lib/booking/booking-session-types";
import { quoteDebugLog } from "@/lib/booking/quote-debug";
import { getCommissionPercentage } from "@/lib/booking/platform-settings-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { BookingType } from "@/lib/validations/enums";

export type QuoteRequestTrip = {
  booking_type: BookingType;
  route: BookingRoute;
  pickup_date: string;
  pickup_time: string;
  return_date?: string;
  return_time?: string;
  pickup_is_airport: boolean;
  dropoff_is_airport: boolean;
};

function mapPricing(row: {
  base_fare: number;
  per_mile: number;
  per_minute: number;
  minimum_fare?: number | null;
}): OperatorPricingInput {
  return {
    base_fare: Number(row.base_fare),
    per_mile: Number(row.per_mile),
    per_minute: Number(row.per_minute),
    minimum_fare: Number(row.minimum_fare ?? 5),
  };
}

function mapRule(row: {
  rule_key: string;
  name: string;
  rule_type: string;
  value: number;
  is_active: boolean;
  time_start: string | null;
  time_end: string | null;
}): PriceRuleInput {
  const timeStart = row.time_start
    ? String(row.time_start).slice(0, 5)
    : null;
  const timeEnd = row.time_end ? String(row.time_end).slice(0, 5) : null;

  return {
    rule_key: row.rule_key,
    name: row.name,
    rule_type: row.rule_type as PriceRuleInput["rule_type"],
    value: Number(row.value),
    is_active: row.is_active,
    time_start: timeStart,
    time_end: timeEnd,
  };
}

export async function fetchOperatorQuoteData(operatorId: string): Promise<{
  pricing: OperatorPricingInput | null;
  rules: PriceRuleInput[];
}> {
  const supabase = createServiceRoleClient();

  const [{ data: pricingRow }, { data: rulesRows }] = await Promise.all([
    supabase
      .from("operator_base_pricing")
      .select("base_fare, per_mile, per_minute, minimum_fare")
      .eq("operator_id", operatorId)
      .maybeSingle(),
    supabase
      .from("price_rules")
      .select(
        "rule_key, name, rule_type, value, is_active, time_start, time_end",
      )
      .eq("operator_id", operatorId),
  ]);

  return {
    pricing: pricingRow ? mapPricing(pricingRow) : null,
    rules: (rulesRows ?? []).map(mapRule),
  };
}

export async function quoteOperatorTrip(
  operatorId: string,
  trip: QuoteRequestTrip,
): Promise<BookingQuote | null> {
  const { pricing, rules } = await fetchOperatorQuoteData(operatorId);
  if (!pricing) {
    quoteDebugLog(`operator ${operatorId}: no base pricing — quote skipped`);
    return null;
  }

  const commissionPercent = await getCommissionPercentage();
  const context = buildTripQuoteContext(trip);

  quoteDebugLog(`operator ${operatorId}: quoting`, {
    pricing,
    active_rules: rules.filter((r) => r.is_active).map((r) => ({
      key: r.rule_key,
      type: r.rule_type,
      value: r.value,
    })),
    trip,
  });

  return calculateBookingQuote(pricing, context, rules, commissionPercent);
}

export async function quoteOperatorTripWithData(
  pricing: OperatorPricingInput,
  rules: PriceRuleInput[],
  trip: QuoteRequestTrip,
  commissionPercent: number,
  operatorId?: string,
): Promise<BookingQuote> {
  if (operatorId) {
    quoteDebugLog(`operator ${operatorId}: quoting (batch)`);
  }
  const context = buildTripQuoteContext(trip);
  return calculateBookingQuote(pricing, context, rules, commissionPercent);
}

export function tripFromQuoteRequest(
  trip: QuoteRequestTrip,
): TripQuoteContext {
  return buildTripQuoteContext(trip);
}
