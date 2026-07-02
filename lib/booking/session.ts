import type { TaxibookBookingSession } from "@/lib/booking/booking-session-types";
import { normalizeBookingServiceType } from "@/lib/operator/fleet-vehicle-types";
import { bookingData, guestSession } from "@/lib/guest/session";

export type {
  BookingPlace,
  BookingRoute,
  SelectedOperatorSession,
  TaxibookBookingSession,
} from "@/lib/booking/booking-session-types";

export const TAXIBOOK_BOOKING_STORAGE_KEY = "taxibook_booking";
export const TAXIBOOK_GUEST_SESSION_KEY = "taxibook_guest_session";
export const TAXIBOOK_CONFIRMATION_REF_KEY = "taxibook_confirmation_ref";
export const TAXIBOOK_CONFIRMATION_SNAPSHOT_KEY = "taxibook_confirmation_snapshot";

export type ConfirmationSnapshot = {
  reference: string;
  total: number;
  trip: TaxibookBookingSession;
  customer_email?: string;
};

export function saveConfirmationSnapshot(data: ConfirmationSnapshot): void {
  sessionStorage.setItem(
    TAXIBOOK_CONFIRMATION_SNAPSHOT_KEY,
    JSON.stringify(data),
  );
}

export function loadConfirmationSnapshot(): ConfirmationSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TAXIBOOK_CONFIRMATION_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConfirmationSnapshot;
  } catch {
    return null;
  }
}

export type TaxibookGuestSession = {
  bookingId: string;
  email: string;
  reference?: string;
};

export function saveTaxibookGuestSession(data: TaxibookGuestSession): void {
  guestSession.set({
    bookingId: data.bookingId,
    email: data.email,
    reference: data.reference ?? "",
  });
}

export function loadTaxibookGuestSession(): TaxibookGuestSession | null {
  const session = guestSession.get();
  if (!session) return null;
  return {
    bookingId: session.bookingId,
    email: session.email,
    reference: session.reference,
  };
}

export function clearTaxibookGuestSession(): void {
  guestSession.clear();
}

export function saveConfirmationReference(reference: string): void {
  sessionStorage.setItem(TAXIBOOK_CONFIRMATION_REF_KEY, reference);
}

export function saveTaxibookBooking(data: TaxibookBookingSession): void {
  bookingData.set(data);
}

export function patchTaxibookBooking(
  patch: Partial<TaxibookBookingSession>,
): TaxibookBookingSession | null {
  const current = loadTaxibookBooking();
  if (!current) return null;
  const next = { ...current, ...patch };
  saveTaxibookBooking(next);
  return next;
}

export function loadTaxibookBooking(): TaxibookBookingSession | null {
  const stored = bookingData.get();
  if (!stored) return null;

  const service_type = normalizeBookingServiceType(stored.service_type);
  if (service_type === stored.service_type) return stored;

  const next = { ...stored, service_type };
  saveTaxibookBooking(next);
  return next;
}

export function clearTaxibookBooking(): void {
  bookingData.clear();
}
