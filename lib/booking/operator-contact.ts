import type { CustomerBookingRow } from "@/types";

export type OperatorContact = {
  email: string | null;
  phone: string | null;
};

export function operatorContactFromRow(
  operators: CustomerBookingRow["operators"],
): OperatorContact | null {
  if (!operators) return null;
  const email = operators.email?.trim() || null;
  const phone = operators.phone?.trim() || null;
  if (!email && !phone) return null;
  return { email, phone };
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function mailtoHref(email: string, bookingReference: string): string {
  const subject = encodeURIComponent(`Booking ${bookingReference}`);
  return `mailto:${email}?subject=${subject}`;
}

/** Opens Gmail web compose (falls back to mailto if user prefers another client). */
export function gmailComposeHref(
  email: string,
  bookingReference: string,
): string {
  const subject = `Booking ${bookingReference}`;
  const body = `Hello,\n\nI am contacting you about booking ${bookingReference}.\n\n`;
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: email,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
