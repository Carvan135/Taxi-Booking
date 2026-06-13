import {
  ctaButton,
  emailHeading,
  emailParagraph,
  escapeHtml,
  referenceBadge,
  wrapEmailTemplate,
} from "@/lib/email/templates/base";

export function tripUpdateEmail(input: {
  title: string;
  message: string;
  reference: string;
  customerName?: string | null;
  actionLabel?: string;
  actionHref?: string;
}): { subject: string; html: string } {
  const name = input.customerName?.trim() || "there";

  let content = `
    ${emailHeading(escapeHtml(input.title))}
    ${emailParagraph(`Hi ${escapeHtml(name)},`)}
    ${emailParagraph(escapeHtml(input.message))}
    ${referenceBadge(input.reference)}
  `;

  if (input.actionHref && input.actionLabel) {
    content += ctaButton(input.actionHref, input.actionLabel);
  }

  return {
    subject: `${input.title} — ${input.reference}`,
    html: wrapEmailTemplate(content, `${input.title}: ${input.message}`),
  };
}
