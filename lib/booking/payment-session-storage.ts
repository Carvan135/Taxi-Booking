const PAYMENT_SESSION_KEY = "taxibook_payment_session";

export type StoredPaymentSession = {
  payment_intent_id: string;
  client_secret: string;
  trip_fingerprint: string;
  operator_id: string;
  total: number;
  platform_fee: number;
  operator_payout: number;
  created_at: string;
};

export function savePaymentSession(data: StoredPaymentSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify(data));
}

export function loadPaymentSession(): StoredPaymentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PAYMENT_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPaymentSession;
  } catch {
    return null;
  }
}

export function clearPaymentSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PAYMENT_SESSION_KEY);
}
