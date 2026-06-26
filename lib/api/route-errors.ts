/** Structured server-side logging for API route failures (developers). */

export function serializeUnknownError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  if (err && typeof err === "object") {
    const record = err as Record<string, unknown>;
    return {
      message: record.message ?? String(err),
      code: record.code,
      details: record.details,
      hint: record.hint,
    };
  }
  return { message: String(err) };
}

export function logRouteError(
  context: string,
  err: unknown,
  meta?: Record<string, unknown>,
): void {
  console.error(`[${context}]`, {
    ...meta,
    error: serializeUnknownError(err),
  });
}

/** End-user copy for draft booking failures. */
export function userMessageForDraftFailure(options?: {
  code?: string;
  operatorMessage?: string;
}): string {
  if (options?.code === "amount_mismatch") {
    return "The price was updated. Please refresh the page to see the latest total.";
  }
  if (options?.operatorMessage) {
    return userMessageForOperatorError(options.operatorMessage);
  }
  return "We couldn't save your booking details. Please check your information and try again.";
}

export function userMessageForDraftUnavailable(): string {
  return "Booking is temporarily unavailable. Please try again in a few minutes.";
}

export function userMessageForInvalidBookingRequest(): string {
  return "Please check your booking details and try again.";
}

export function userMessageForPaymentSessionError(kind: "expired" | "invalid"): string {
  if (kind === "expired") {
    return "Your payment session expired. Please refresh the page and try again.";
  }
  return "Your payment session is no longer valid. Please refresh the page and try again.";
}

export function userMessageForOperatorError(message: string): string {
  const normalized = message.trim();
  if (
    normalized === "Operator is not available for bookings" ||
    normalized === "Operator is not accepting bookings right now"
  ) {
    return normalized;
  }
  if (normalized === "Operator not found") {
    return "This operator is no longer available. Please choose another operator.";
  }
  return "This operator is no longer available. Please choose another operator.";
}

export function userMessageForFinalizeFailure(options?: {
  paymentSucceeded?: boolean;
  code?: string;
}): string {
  if (options?.code === "amount_mismatch") {
    return "The price was updated. Please review the new total and pay again.";
  }
  if (options?.paymentSucceeded) {
    return "Your payment was received but we couldn't confirm your booking yet. Please wait a moment and refresh, or contact support with your payment confirmation.";
  }
  return "We couldn't complete your booking. Please try again.";
}

export function userMessageForPaymentVerifyFailure(): string {
  return "We couldn't verify your payment session. Please refresh the page and try again.";
}
