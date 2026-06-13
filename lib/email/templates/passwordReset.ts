import {
  ctaButton,
  emailHeading,
  emailParagraph,
  escapeHtml,
  wrapEmailTemplate,
} from "@/lib/email/templates/base";

export function passwordResetEmail(data: {
  resetUrl: string;
  name?: string;
}): { subject: string; html: string } {
  const greeting = data.name?.trim()
    ? `Hi ${escapeHtml(data.name.trim())},`
    : "Hi there,";

  const content = `
    ${emailHeading("Reset Your Password")}
    ${emailParagraph(greeting)}
    ${emailParagraph("We received a request to reset your AirportHub account password.")}
    ${ctaButton(data.resetUrl, "Reset Password")}
    ${emailParagraph("<strong>Link expires in 1 hour.</strong>")}
    ${emailParagraph("If you didn't request this, ignore this email — your password will stay the same.")}
  `;

  return {
    subject: "Reset your AirportHub password",
    html: wrapEmailTemplate(
      content,
      "Reset your AirportHub password. Link expires in 1 hour.",
    ),
  };
}
