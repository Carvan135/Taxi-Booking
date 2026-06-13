import {
  emailHeading,
  emailParagraph,
  escapeHtml,
  formatMoney,
  priceHighlight,
  referenceBadge,
  wrapEmailTemplate,
} from "@/lib/email/templates/base";

export function refundConfirmationEmail(data: {
  reference: string;
  amount: number;
  refundType: string;
  email: string;
}): { subject: string; html: string } {
  const typeLabel =
    data.refundType.toLowerCase() === "partial" ? "Partial" : "Full";

  const content = `
    ${emailHeading("Refund Processed")}
    ${emailParagraph(`We've processed a refund for booking ${escapeHtml(data.reference)} to ${escapeHtml(data.email)}.`)}
    ${referenceBadge(data.reference)}
    ${priceHighlight("Refund amount", data.amount)}
    ${emailParagraph(`<strong>Refund type:</strong> ${escapeHtml(typeLabel)}`)}
    ${emailParagraph("Allow <strong>5–10 business days</strong> for the refund to appear on your original payment method.")}
    ${emailParagraph("If you have questions, contact support@airporthub.co.uk.")}
  `;

  return {
    subject: `Refund processed — ${data.reference}`,
    html: wrapEmailTemplate(
      content,
      `Refund of ${formatMoney(data.amount)} processed for ${data.reference}.`,
    ),
  };
}
