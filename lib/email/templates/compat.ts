import { getAppUrl } from "@/lib/env/app-url";
import type { BookingEmailSnapshot } from "@/lib/email/booking-context";
import { snapshotToBookingEmailData } from "@/lib/email/map-booking-email-data";
import { bookingConfirmationEmail } from "@/lib/email/templates/bookingConfirmation";
import { bookingReceiptEmail } from "@/lib/email/templates/bookingReceipt";
import { passwordResetEmail } from "@/lib/email/templates/passwordReset";
import { tripUpdateEmail } from "@/lib/email/templates/tripUpdate";

/** @deprecated Use bookingConfirmationEmail from @/lib/email/templates */
export function buildBookingConfirmationEmail(snapshot: BookingEmailSnapshot): {
  subject: string;
  html: string;
  text: string;
} {
  const data = snapshotToBookingEmailData(snapshot);
  const { subject, html } = bookingConfirmationEmail(data);
  const lookupUrl = `${data.app_url}/bookings/lookup?${new URLSearchParams({
    ref: data.reference,
    email: data.customer_email,
  }).toString()}`;

  return {
    subject,
    html,
    text: [
      `Hi ${data.customer_name},`,
      "",
      `Your AirportHub booking ${data.reference} is confirmed.`,
      `Total paid: £${data.price.toFixed(2)}`,
      "",
      `View booking: ${lookupUrl}`,
    ].join("\n"),
  };
}

/** @deprecated Use tripUpdateEmail from @/lib/email/templates */
export function buildTripUpdateEmail(input: {
  title: string;
  message: string;
  reference: string;
  customerName?: string | null;
  actionLabel?: string;
  actionHref?: string;
}): { subject: string; html: string; text: string } {
  const { subject, html } = tripUpdateEmail(input);
  const name = input.customerName?.trim() || "there";
  return {
    subject,
    html,
    text: [
      `Hi ${name},`,
      "",
      input.message,
      "",
      `Reference: ${input.reference}`,
      input.actionHref ? `Link: ${input.actionHref}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function buildReceiptHtml(snapshot: BookingEmailSnapshot): string {
  const data = snapshotToBookingEmailData(snapshot);
  return bookingReceiptEmail(data).html;
}

/** @deprecated Use passwordResetEmail from @/lib/email/templates */
export function buildPasswordResetEmail(resetUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  const { subject, html } = passwordResetEmail({ resetUrl });
  return {
    subject,
    html,
    text: [
      "Reset your AirportHub password:",
      resetUrl,
      "",
      "If you did not request this, ignore this email.",
    ].join("\n"),
  };
}

export function bookingLookupUrl(reference: string, email: string): string {
  const appUrl = getAppUrl();
  const params = new URLSearchParams({ ref: reference, email });
  return `${appUrl}/bookings/lookup?${params.toString()}`;
}
