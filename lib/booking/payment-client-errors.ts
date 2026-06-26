/** Browser-side logging for payment API failures (developers). */

export function logPaymentClientError(
  context: string,
  meta: Record<string, unknown>,
): void {
  console.error(`[payment] ${context}`, meta);
}

/** Prefer API user message; fall back to safe copy if missing. */
export function paymentUiError(
  apiMessage: string | undefined,
  fallback: string,
): string {
  const trimmed = apiMessage?.trim();
  if (!trimmed) return fallback;
  return trimmed;
}

export const PAYMENT_UI = {
  draftFailed:
    "We couldn't save your booking details. Please check your information and try again.",
  bookingFailed:
    "We couldn't complete your booking. Please try again.",
  paymentProcessing:
    "Payment is still processing. Please wait a moment and try again.",
} as const;
