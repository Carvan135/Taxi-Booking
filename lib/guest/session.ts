import type { TaxibookBookingSession } from "@/lib/booking/booking-session-types";

const GUEST_SESSION_KEY = "taxibook_guest_session";
const BOOKING_DATA_KEY = "taxibook_booking";

export type GuestSessionData = {
  bookingId: string;
  email: string;
  reference: string;
};

export type BookingFormData = TaxibookBookingSession;

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(data));
}

export const guestSession = {
  set: (data: GuestSessionData) => {
    writeJson(GUEST_SESSION_KEY, data);
  },

  get: (): GuestSessionData | null => {
    return readJson<GuestSessionData>(GUEST_SESSION_KEY);
  },

  clear: () => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(GUEST_SESSION_KEY);
  },
};

export const bookingData = {
  set: (data: BookingFormData) => {
    writeJson(BOOKING_DATA_KEY, data);
  },

  get: (): BookingFormData | null => {
    return readJson<BookingFormData>(BOOKING_DATA_KEY);
  },

  clear: () => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(BOOKING_DATA_KEY);
  },
};
