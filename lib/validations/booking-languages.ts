export const BOOKING_LANGUAGES = [
  "english",
  "arabic",
  "urdu",
  "punjabi",
  "bengali",
  "hindi",
  "polish",
  "romanian",
  "spanish",
  "french",
  "other",
] as const;

export type BookingLanguage = (typeof BOOKING_LANGUAGES)[number];

export const BOOKING_LANGUAGE_LABELS: Record<BookingLanguage, string> = {
  english: "English",
  arabic: "Arabic",
  urdu: "Urdu",
  punjabi: "Punjabi",
  bengali: "Bengali",
  hindi: "Hindi",
  polish: "Polish",
  romanian: "Romanian",
  spanish: "Spanish",
  french: "French",
  other: "Other",
};

export const DEFAULT_BOOKING_LANGUAGE: BookingLanguage = "english";
