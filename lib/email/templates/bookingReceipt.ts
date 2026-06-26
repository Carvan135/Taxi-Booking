import type { BookingEmailData, BookingEmailReturnLeg } from "@/lib/email/types";
import {
  detailTable,
  emailHeading,
  emailParagraph,
  escapeHtml,
  formatDateDisplay,
  formatMoney,
  formatServiceType,
  referenceBadge,
  sectionLabel,
  wrapEmailTemplate,
} from "@/lib/email/templates/base";

export function bookingReceiptEmail(
  data: BookingEmailData & BookingEmailReturnLeg,
): { subject: string; html: string } {
  const journeyFare = Math.max(0, data.price - data.platform_commission);
  const feePercent =
    data.price > 0
      ? Math.round((data.platform_commission / data.price) * 100)
      : 0;

  const summaryRows = [
    { label: "Pickup", value: escapeHtml(data.pickup_address) },
    { label: "Dropoff", value: escapeHtml(data.dropoff_address) },
    {
      label: "Date & time",
      value: escapeHtml(formatDateDisplay(data.pickup_date, data.pickup_time)),
    },
    { label: "Passengers", value: String(data.passengers) },
    {
      label: "Vehicle type",
      value: escapeHtml(formatServiceType(data.service_type)),
    },
    { label: "Operator", value: escapeHtml(data.operator_name) },
    { label: "Vehicle", value: escapeHtml(data.vehicle_type) },
  ];

  if (data.booking_type === "return" && data.return_date && data.return_time) {
    summaryRows.push({
      label: "Return",
      value: escapeHtml(formatDateDisplay(data.return_date, data.return_time)),
    });
  }

  const itemRows = [
    { label: "Journey fare", value: formatMoney(journeyFare) },
    {
      label: `Platform fee (${feePercent}%)`,
      value: formatMoney(data.platform_commission),
    },
    {
      label: "Total paid",
      value: `<strong style="color:#1E3A5F;">${formatMoney(data.price)}</strong>`,
    },
  ];

  const content = `
    ${emailHeading("Payment Receipt")}
    ${emailParagraph(`Issued to ${escapeHtml(data.customer_name)} (${escapeHtml(data.customer_email)})`)}
    ${referenceBadge(data.reference)}
    ${sectionLabel("Payment summary")}
    ${detailTable(itemRows)}
    ${sectionLabel("Booking summary")}
    ${detailTable(summaryRows)}
    ${emailParagraph("<em>PDF receipt attached to this email.</em>")}
    ${emailParagraph("Thank you for booking with AirportHub. For support, contact support@airporthub.co.uk.")}
  `;

  return {
    subject: `Payment receipt — ${data.reference}`,
    html: wrapEmailTemplate(
      content,
      `Receipt for ${data.reference}. Total paid ${formatMoney(data.price)}.`,
    ),
  };
}
