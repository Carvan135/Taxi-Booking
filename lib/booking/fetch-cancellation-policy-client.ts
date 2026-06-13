import type { CancellationPolicyEvaluation } from "@/lib/booking/cancellation-policy";

export type ClientCancellationPolicy = CancellationPolicyEvaluation & {
  cutoffHours?: number;
  fullRefundHours?: number;
};

export async function fetchCancellationPolicyClient(
  bookingId: string,
): Promise<ClientCancellationPolicy | null> {
  const res = await fetch(`/api/bookings/${bookingId}/cancellation-policy`);
  if (!res.ok) return null;
  return (await res.json()) as ClientCancellationPolicy;
}
