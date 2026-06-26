import type { CreateBookingBody } from "@/lib/booking/insert-pending-bookings";

export type FinalizeBookingResponse = {
  success?: boolean;
  booking_reference?: string;
  booking_id?: string;
  group_reference?: string;
  error?: string;
  payment_succeeded?: boolean;
  details?: { code?: string };
};

export async function finalizeBookingAfterPayment(
  body: CreateBookingBody,
): Promise<FinalizeBookingResponse & { ok: boolean; status: number }> {
  const res = await fetch("/api/bookings/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as FinalizeBookingResponse;

  if (res.status === 503 && json.payment_succeeded) {
    const recovery = await tryFinalizeFromSucceededIntent(body);
    if (recovery.ok && recovery.booking_reference) {
      return {
        ...recovery,
        ok: true,
        status: 200,
        success: true,
        booking_reference: recovery.booking_reference,
      };
    }

    return {
      ...json,
      ok: true,
      status: res.status,
      success: true,
      booking_reference: json.booking_reference,
    };
  }

  return {
    ...json,
    ok: res.ok,
    status: res.status,
  };
}

export async function tryFinalizeFromSucceededIntent(
  body: CreateBookingBody,
): Promise<FinalizeBookingResponse & { ok: boolean }> {
  const res = await fetch("/api/stripe/payment-intent/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as FinalizeBookingResponse & {
    finalized?: boolean;
  };

  return {
    ...json,
    ok: Boolean(json.finalized) || res.ok,
  };
}

export async function pollPaymentIntentStatus(
  paymentIntentId: string,
): Promise<{ status: string; can_finalize: boolean } | null> {
  const res = await fetch(
    `/api/stripe/payment-intent/status?payment_intent_id=${encodeURIComponent(paymentIntentId)}`,
  );
  if (!res.ok) return null;
  return (await res.json()) as { status: string; can_finalize: boolean };
}
