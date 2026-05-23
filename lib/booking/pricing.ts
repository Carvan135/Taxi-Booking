import type { BookingQuote } from "@/lib/booking/quote";
import type { BookingType } from "@/types";

export type PriceLegLine = {
  label: string;
  baseFare: number;
};

export type BookingPriceBreakdown = {
  legs: PriceLegLine[];
  baseFareTotal: number;
  platformFee: number;
  platformFeePercent: number;
  total: number;
  /** Full metered quote when available from the server. */
  quote?: BookingQuote;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateBookingPrice(
  baseFarePerLeg: number,
  bookingType: BookingType,
  commissionPercent: number,
): BookingPriceBreakdown {
  const legs: PriceLegLine[] =
    bookingType === "return"
      ? [
          { label: "Outbound", baseFare: baseFarePerLeg },
          { label: "Return", baseFare: baseFarePerLeg },
        ]
      : [{ label: "Journey", baseFare: baseFarePerLeg }];

  const baseFareTotal = roundMoney(baseFarePerLeg * legs.length);
  const platformFee = roundMoney((baseFareTotal * commissionPercent) / 100);
  const total = roundMoney(baseFareTotal + platformFee);

  return {
    legs,
    baseFareTotal,
    platformFee,
    platformFeePercent: commissionPercent,
    total,
  };
}

export function toStripeAmountGbp(pounds: number): number {
  return Math.round(pounds * 100);
}
