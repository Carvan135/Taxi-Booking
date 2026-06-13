import { getUkPickupDateTimeInstant } from "@/lib/booking/uk-pickup-time";
import type { CancellationPolicySettings } from "@/lib/booking/platform-settings-server";

export type CancellationPolicyEvaluation = {
  allowed: boolean;
  hoursUntilPickup: number | null;
  fullRefundEligible: boolean;
  summary: string;
  detail: string;
};

function hoursUntilPickup(
  pickupDate: string,
  pickupTime: string,
  now: Date = new Date(),
): number | null {
  const pickup = getUkPickupDateTimeInstant(pickupDate, pickupTime);
  if (!pickup) return null;
  const diffMs = pickup.getTime() - now.getTime();
  return diffMs / (60 * 60 * 1000);
}

export function evaluateCancellationPolicy(
  pickupDate: string,
  pickupTime: string,
  settings: CancellationPolicySettings,
  options?: {
    journeyStarted?: boolean;
    paymentStatus?: string;
    now?: Date;
  },
): CancellationPolicyEvaluation {
  const now = options?.now ?? new Date();
  const hours = hoursUntilPickup(pickupDate, pickupTime, now);

  if (options?.journeyStarted) {
    return {
      allowed: false,
      hoursUntilPickup: hours,
      fullRefundEligible: false,
      summary: "Cancellation is not available after your journey has started.",
      detail:
        "Contact support if you need help — your driver is already en route or on the trip.",
    };
  }

  if (hours != null && hours < settings.cutoffHours) {
    return {
      allowed: false,
      hoursUntilPickup: hours,
      fullRefundEligible: false,
      summary: `Cancellation closes ${settings.cutoffHours} hours before pickup.`,
      detail:
        "Your pickup is too soon to cancel online. Please contact support for urgent changes.",
    };
  }

  const paid = options?.paymentStatus === "paid";
  const fullRefundEligible =
    paid &&
    hours != null &&
    hours >= settings.fullRefundHours;

  let summary = "You can cancel this booking.";
  let detail = paid
    ? "Refund handling depends on how close you are to pickup — see below."
    : "You have not been charged yet.";

  if (paid && fullRefundEligible) {
    summary = `Full refund available — pickup is more than ${settings.fullRefundHours} hours away.`;
    detail =
      "If you cancel now, a full refund will be processed to your original payment method.";
  } else if (paid && hours != null && hours < settings.fullRefundHours) {
    summary = `Inside ${settings.fullRefundHours}-hour window — refund may be partial or subject to review.`;
    detail = settings.partialRefundEnabled
      ? "Cancellations close to pickup may receive a partial refund or require admin review."
      : "Cancellations close to pickup may not qualify for a full refund. Contact support if unsure.";
  }

  return {
    allowed: true,
    hoursUntilPickup: hours,
    fullRefundEligible,
    summary,
    detail,
  };
}
