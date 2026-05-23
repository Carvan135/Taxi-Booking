export type PayoutReleaseSnapshot = {
  payout_eligible_at: string | null;
  payout_released_at: string | null;
};

/** Human-readable countdown until payout is eligible (static snapshot). */
export function formatPayoutReleaseCountdown(
  eligibleAt: string,
  nowMs: number = Date.now(),
): string {
  const diff = new Date(eligibleAt).getTime() - nowMs;
  if (diff <= 0) return "Eligible now";

  const totalMins = Math.ceil(diff / (60 * 1000));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;

  if (days > 0) {
    return days === 1
      ? `1 day${hours > 0 ? ` ${hours}h` : ""} left`
      : `${days} days${hours > 0 ? ` ${hours}h` : ""} left`;
  }
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
  }
  return `${mins}m left`;
}

export function payoutReleaseStatus(
  row: PayoutReleaseSnapshot,
  nowMs: number = Date.now(),
): "released" | "countdown" | "ready" | "pending" {
  if (row.payout_released_at) return "released";
  if (!row.payout_eligible_at) return "pending";
  if (new Date(row.payout_eligible_at).getTime() > nowMs) return "countdown";
  return "ready";
}
