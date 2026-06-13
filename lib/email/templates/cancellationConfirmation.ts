import {
  emailHeading,
  emailParagraph,
  escapeHtml,
  formatMoney,
  priceHighlight,
  referenceBadge,
  wrapEmailTemplate,
} from "@/lib/email/templates/base";

export function cancellationConfirmationEmail(data: {
  reference: string;
  refundAmount?: number;
  email: string;
}): { subject: string; html: string } {
  const refundMessage =
    data.refundAmount != null && data.refundAmount > 0
      ? priceHighlight("Refund initiated", data.refundAmount)
      : emailParagraph(
          "This booking is not eligible for a refund under the cancellation policy in effect at the time of booking.",
        );

  const content = `
    ${emailHeading("Booking Cancelled")}
    ${emailParagraph(`Your booking ${escapeHtml(data.reference)} has been cancelled.`)}
    ${referenceBadge(data.reference)}
    ${refundMessage}
    ${emailParagraph("You can view your booking history anytime at airporthub.co.uk.")}
  `;

  const preview =
    data.refundAmount != null && data.refundAmount > 0
      ? `Booking ${data.reference} cancelled. Refund ${formatMoney(data.refundAmount)} initiated.`
      : `Booking ${data.reference} has been cancelled.`;

  return {
    subject: `Booking cancelled — ${data.reference}`,
    html: wrapEmailTemplate(content, preview),
  };
}
