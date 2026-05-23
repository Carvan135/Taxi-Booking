import type { BookingRoute } from "@/lib/booking/booking-session-types";
import { quoteDebugLog } from "@/lib/booking/quote-debug";
import {
  isOutOfHoursPickupUK,
  isWeekendPickupUK,
  parseUkPickupDateTime,
  UK_BOOKING_TIMEZONE,
} from "@/lib/booking/uk-pickup-time";
import type { BookingType } from "@/lib/validations/enums";
import type { PriceRuleKey } from "@/lib/booking/price-rule-catalog";
import { getPriceRuleTemplate } from "@/lib/booking/price-rule-catalog";
import type { RuleType } from "@/lib/validations/enums";
import { RULE_TYPE } from "@/lib/validations/enums";

export type OperatorPricingInput = {
  base_fare: number;
  per_mile: number;
  per_minute: number;
  minimum_fare: number;
};

export type PriceRuleInput = {
  rule_key: string;
  name: string;
  rule_type: RuleType;
  value: number;
  is_active: boolean;
  time_start: string | null;
  time_end: string | null;
};

export type TripLegContext = {
  label: string;
  route: BookingRoute;
  pickup_date: string;
  pickup_time: string;
  pickup_is_airport: boolean;
  dropoff_is_airport: boolean;
};

export type TripQuoteContext = {
  booking_type: BookingType;
  legs: TripLegContext[];
};

export type AppliedRuleLine = {
  rule_key: string;
  name: string;
  rule_type: RuleType;
  value: number;
  impact: number;
};

export type QuoteLegBreakdown = {
  label: string;
  base_fare: number;
  distance_charge: number;
  time_charge: number;
  metered_subtotal: number;
  minimum_fare: number;
  after_minimum: number;
  rules_applied: AppliedRuleLine[];
  leg_total: number;
};

export type BookingQuote = {
  legs: QuoteLegBreakdown[];
  operator_subtotal: number;
  platform_fee: number;
  platform_fee_percent: number;
  total: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function ruleMatches(
  rule: PriceRuleInput,
  leg: TripLegContext,
): boolean {
  if (!rule.is_active) return false;
  if (!getPriceRuleTemplate(rule.rule_key)) return false;

  const key = rule.rule_key as PriceRuleKey;

  switch (key) {
    case "airport_pickup":
      return leg.pickup_is_airport;
    case "airport_dropoff":
      return leg.dropoff_is_airport;
    case "out_of_hours":
      return isOutOfHoursPickupUK(
        leg.pickup_time,
        rule.time_start,
        rule.time_end,
      );
    case "weekend":
      return isWeekendPickupUK(leg.pickup_date, leg.pickup_time);
    default:
      return false;
  }
}

function applyRulesToLeg(
  afterMinimum: number,
  leg: TripLegContext,
  rules: PriceRuleInput[],
): { total: number; applied: AppliedRuleLine[] } {
  const matching = rules.filter((r) => ruleMatches(r, leg));
  const fixedRules = matching.filter((r) => r.rule_type === RULE_TYPE.fixed_fee);
  const multiplierRules = matching.filter(
    (r) => r.rule_type === RULE_TYPE.multiplier,
  );

  const ukPickup = parseUkPickupDateTime(leg.pickup_date, leg.pickup_time);

  quoteDebugLog(`── ${leg.label}: price rules ──`, {
    pickup_date: leg.pickup_date,
    pickup_time: leg.pickup_time,
    timezone: UK_BOOKING_TIMEZONE,
    uk_weekday: ukPickup?.weekdayLabel ?? "(invalid date/time)",
    uk_is_weekend: ukPickup
      ? ukPickup.dayOfWeek === 0 || ukPickup.dayOfWeek === 6
      : null,
    pickup_is_airport: leg.pickup_is_airport,
    dropoff_is_airport: leg.dropoff_is_airport,
    after_minimum: afterMinimum,
    active_rules_count: rules.filter((r) => r.is_active).length,
    matching_rules: matching.map((r) => r.rule_key),
  });

  let total = afterMinimum;
  const applied: AppliedRuleLine[] = [];

  for (const rule of fixedRules) {
    const fee = roundMoney(rule.value);
    const before = total;
    total = roundMoney(total + fee);
    quoteDebugLog(`  + fixed fee: ${rule.name} (${rule.rule_key})`, {
      value: rule.value,
      before,
      after: total,
    });
    applied.push({
      rule_key: rule.rule_key,
      name: rule.name,
      rule_type: rule.rule_type,
      value: rule.value,
      impact: fee,
    });
  }

  for (const rule of multiplierRules) {
    const before = total;
    total = roundMoney(total * rule.value);
    quoteDebugLog(`  × multiplier: ${rule.name} (${rule.rule_key})`, {
      multiplier: rule.value,
      before,
      after: total,
      impact: roundMoney(total - before),
    });
    applied.push({
      rule_key: rule.rule_key,
      name: rule.name,
      rule_type: rule.rule_type,
      value: rule.value,
      impact: roundMoney(total - before),
    });
  }

  if (matching.length === 0) {
    quoteDebugLog(`  (no price rules matched for ${leg.label})`);
  }

  return { total, applied };
}

export function calculateLegQuote(
  pricing: OperatorPricingInput,
  leg: TripLegContext,
  rules: PriceRuleInput[],
): QuoteLegBreakdown {
  const distanceCharge = roundMoney(leg.route.distanceMiles * pricing.per_mile);
  const timeCharge = roundMoney(leg.route.durationMinutes * pricing.per_minute);
  const meteredSubtotal = roundMoney(
    pricing.base_fare + distanceCharge + timeCharge,
  );
  const afterMinimum = roundMoney(
    Math.max(meteredSubtotal, pricing.minimum_fare),
  );

  quoteDebugLog(`── ${leg.label}: metered fare ──`, {
    distance_miles: leg.route.distanceMiles,
    duration_minutes: leg.route.durationMinutes,
    base_fare: pricing.base_fare,
    per_mile: pricing.per_mile,
    per_minute: pricing.per_minute,
    minimum_fare: pricing.minimum_fare,
    distance_charge: `${leg.route.distanceMiles} × ${pricing.per_mile} = ${distanceCharge}`,
    time_charge: `${leg.route.durationMinutes} × ${pricing.per_minute} = ${timeCharge}`,
    metered_subtotal: `${pricing.base_fare} + ${distanceCharge} + ${timeCharge} = ${meteredSubtotal}`,
    minimum_applied: meteredSubtotal < pricing.minimum_fare,
    after_minimum:
      meteredSubtotal < pricing.minimum_fare
        ? `max(${meteredSubtotal}, ${pricing.minimum_fare}) = ${afterMinimum}`
        : afterMinimum,
  });

  const { total, applied } = applyRulesToLeg(afterMinimum, leg, rules);

  quoteDebugLog(`── ${leg.label}: leg total = £${total} ──`);

  return {
    label: leg.label,
    base_fare: pricing.base_fare,
    distance_charge: distanceCharge,
    time_charge: timeCharge,
    metered_subtotal: meteredSubtotal,
    minimum_fare: pricing.minimum_fare,
    after_minimum: afterMinimum,
    rules_applied: applied,
    leg_total: total,
  };
}

export function calculateBookingQuote(
  pricing: OperatorPricingInput,
  trip: TripQuoteContext,
  rules: PriceRuleInput[],
  commissionPercent: number,
): BookingQuote {
  quoteDebugLog("════════ quote calculation ════════", {
    booking_type: trip.booking_type,
    leg_count: trip.legs.length,
    operator_pricing: pricing,
    commission_percent: commissionPercent,
  });

  const legs = trip.legs.map((leg) =>
    calculateLegQuote(pricing, leg, rules),
  );

  const operatorSubtotal = roundMoney(
    legs.reduce((sum, leg) => sum + leg.leg_total, 0),
  );
  const platformFee = roundMoney(
    (operatorSubtotal * commissionPercent) / 100,
  );
  const total = roundMoney(operatorSubtotal + platformFee);

  quoteDebugLog("── booking totals ──", {
    leg_totals: legs.map((l) => ({ label: l.label, total: l.leg_total })),
    operator_subtotal: `${legs.map((l) => l.leg_total).join(" + ")} = ${operatorSubtotal}`,
    platform_fee: `${operatorSubtotal} × ${commissionPercent}% = ${platformFee}`,
    customer_total: `${operatorSubtotal} + ${platformFee} = ${total}`,
  });
  quoteDebugLog("════════ end quote ════════");

  return {
    legs,
    operator_subtotal: operatorSubtotal,
    platform_fee: platformFee,
    platform_fee_percent: commissionPercent,
    total,
  };
}

export function buildTripQuoteContext(input: {
  booking_type: BookingType;
  route: BookingRoute;
  pickup_date: string;
  pickup_time: string;
  return_date?: string;
  return_time?: string;
  pickup_is_airport: boolean;
  dropoff_is_airport: boolean;
}): TripQuoteContext {
  const outbound: TripLegContext = {
    label: input.booking_type === "return" ? "Outbound" : "Journey",
    route: input.route,
    pickup_date: input.pickup_date,
    pickup_time: input.pickup_time,
    pickup_is_airport: input.pickup_is_airport,
    dropoff_is_airport: input.dropoff_is_airport,
  };

  if (input.booking_type !== "return") {
    quoteDebugLog("trip context: one-way", { legs: 1, route: input.route });
    return { booking_type: input.booking_type, legs: [outbound] };
  }

  const returnLeg: TripLegContext = {
    label: "Return",
    route: input.route,
    pickup_date: input.return_date ?? input.pickup_date,
    pickup_time: input.return_time ?? input.pickup_time,
    pickup_is_airport: input.dropoff_is_airport,
    dropoff_is_airport: input.pickup_is_airport,
  };

  quoteDebugLog("trip context: return (2 legs, same route)", {
    route: input.route,
    outbound: {
      date: input.pickup_date,
      time: input.pickup_time,
      airports: { pickup: input.pickup_is_airport, dropoff: input.dropoff_is_airport },
    },
    return_leg: {
      date: returnLeg.pickup_date,
      time: returnLeg.pickup_time,
      airports: {
        pickup: returnLeg.pickup_is_airport,
        dropoff: returnLeg.dropoff_is_airport,
      },
    },
  });

  return {
    booking_type: input.booking_type,
    legs: [outbound, returnLeg],
  };
}

/** Map server quote to legacy payment UI breakdown shape. */
export function quoteToDisplayBreakdown(quote: BookingQuote) {
  return {
    legs: quote.legs.map((leg) => ({
      label: leg.label,
      baseFare: leg.leg_total,
    })),
    baseFareTotal: quote.operator_subtotal,
    platformFee: quote.platform_fee,
    platformFeePercent: quote.platform_fee_percent,
    total: quote.total,
    quote,
  };
}
