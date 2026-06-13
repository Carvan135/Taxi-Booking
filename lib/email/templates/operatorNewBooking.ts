import type { BookingEmailData } from "@/lib/email/types";
import {
  ctaButton,
  detailTable,
  emailHeading,
  emailParagraph,
  escapeHtml,
  formatDateDisplay,
  formatServiceType,
  maskPhoneLastFour,
  referenceBadge,
  sectionLabel,
  wrapEmailTemplate,
} from "@/lib/email/templates/base";

export function operatorNewBookingEmail(
  data: BookingEmailData & {
    operatorName: string;
    customer_phone?: string | null;
  },
): { subject: string; html: string } {
  const bookingUrl = `${data.app_url.replace(/\/$/, "")}/operator/bookings`;
  const pickupWhen = formatDateDisplay(data.pickup_date, data.pickup_time);

  const content = `
    ${emailHeading("New Booking Assigned")}
    ${emailParagraph(`Hi ${escapeHtml(data.operatorName)}, a new booking has been assigned to you.`)}
    ${referenceBadge(data.reference)}
    ${emailParagraph(`<strong>Pickup:</strong> ${escapeHtml(pickupWhen)}`)}
    ${sectionLabel("Customer")}
    ${detailTable([
      { label: "Name", value: escapeHtml(data.customer_name) },
      {
        label: "Phone",
        value: escapeHtml(maskPhoneLastFour(data.customer_phone)),
      },
    ])}
    ${sectionLabel("Journey")}
    ${detailTable([
      { label: "Pickup", value: escapeHtml(data.pickup_address) },
      { label: "Dropoff", value: escapeHtml(data.dropoff_address) },
      { label: "Passengers", value: String(data.passengers) },
      {
        label: "Service",
        value: escapeHtml(formatServiceType(data.service_type)),
      },
      { label: "Vehicle", value: escapeHtml(data.vehicle_type) },
    ])}
    ${ctaButton(bookingUrl, "View Booking")}
  `;

  return {
    subject: `New booking — ${data.reference} · ${pickupWhen}`,
    html: wrapEmailTemplate(
      content,
      `New booking ${data.reference}. Pickup ${pickupWhen} at ${data.pickup_address}.`,
    ),
  };
}
