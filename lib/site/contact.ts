export const SITE_DOMAIN = "airporthub.co.uk";
export const SITE_NAME = "AirportHub";
export const SITE_URL = `https://${SITE_DOMAIN}`;

export const SITE_EMAILS = {
  support: "support@airporthub.co.uk",
  bookings: "bookings@airporthub.co.uk",
  operators: "operators@airporthub.co.uk",
  info: "info@airporthub.co.uk",
} as const;

export const CONTACT_CHANNELS = [
  { label: "Customer support", email: SITE_EMAILS.support },
  { label: "Booking enquiries", email: SITE_EMAILS.bookings },
  { label: "Operator partnerships", email: SITE_EMAILS.operators },
  { label: "General information", email: SITE_EMAILS.info },
] as const;
