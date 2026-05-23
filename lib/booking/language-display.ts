import {
  BOOKING_LANGUAGE_LABELS,
  type BookingLanguage,
} from "@/lib/validations/booking-languages";

export function formatBookingLanguage(
  language: string | null | undefined,
): string {
  if (!language) return BOOKING_LANGUAGE_LABELS.english;
  const key = language as BookingLanguage;
  return BOOKING_LANGUAGE_LABELS[key] ?? language;
}
