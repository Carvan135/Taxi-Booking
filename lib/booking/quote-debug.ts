/** Verbose quote calculation logs (server: DEBUG_QUOTE=1 or development). */

const QUOTE_LOG_PREFIX = "[quote]";

export function isQuoteDebugEnabled(): boolean {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.DEBUG_QUOTE === "1" || process.env.DEBUG_QUOTE === "true") {
      return true;
    }
    return process.env.NODE_ENV === "development";
  }
  return false;
}

export function isQuoteDebugEnabledClient(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_DEBUG_QUOTE === "1") return true;
  if (process.env.NEXT_PUBLIC_DEBUG_QUOTE === "true") return true;
  return process.env.NODE_ENV === "development";
}

export function quoteDebugLog(message: string, data?: unknown): void {
  if (!isQuoteDebugEnabled()) return;
  if (data !== undefined) {
    console.log(`${QUOTE_LOG_PREFIX} ${message}`, data);
  } else {
    console.log(`${QUOTE_LOG_PREFIX} ${message}`);
  }
}

export function quoteDebugLogClient(message: string, data?: unknown): void {
  if (!isQuoteDebugEnabledClient()) return;
  if (data !== undefined) {
    console.log(`${QUOTE_LOG_PREFIX} ${message}`, data);
  } else {
    console.log(`${QUOTE_LOG_PREFIX} ${message}`);
  }
}

/** Pretty-print a full quote in the browser console (dev / NEXT_PUBLIC_DEBUG_QUOTE). */
export function logQuoteSummaryClient(
  label: string,
  quote: {
    legs: Array<{
      label: string;
      base_fare: number;
      distance_charge: number;
      time_charge: number;
      metered_subtotal: number;
      minimum_fare: number;
      after_minimum: number;
      rules_applied: Array<{ name: string; rule_key: string; impact: number }>;
      leg_total: number;
    }>;
    operator_subtotal: number;
    platform_fee: number;
    platform_fee_percent: number;
    total: number;
  },
): void {
  if (!isQuoteDebugEnabledClient()) return;
  console.group(`${QUOTE_LOG_PREFIX} ${label}`);
  for (const leg of quote.legs) {
    console.log(`${leg.label}:`, {
      metered: `£${leg.base_fare} + £${leg.distance_charge} (distance) + £${leg.time_charge} (time) = £${leg.metered_subtotal}`,
      minimum: leg.after_minimum > leg.metered_subtotal ? `applied (min £${leg.minimum_fare})` : "not applied",
      after_minimum: `£${leg.after_minimum}`,
      rules: leg.rules_applied.length
        ? leg.rules_applied.map((r) => `${r.name}: +£${r.impact}`)
        : "(none)",
      leg_total: `£${leg.leg_total}`,
    });
  }
  console.log("Totals:", {
    operator_subtotal: `£${quote.operator_subtotal}`,
    platform_fee: `£${quote.platform_fee} (${quote.platform_fee_percent}%)`,
    customer_total: `£${quote.total}`,
  });
  console.groupEnd();
}
