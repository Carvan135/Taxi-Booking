import type { BookingEmailData } from "@/lib/email/types";
import {
  ctaButton,
  detailTable,
  emailHeading,
  emailParagraph,
  escapeHtml,
  formatDateDisplay,
  referenceBadge,
  sectionLabel,
  wrapEmailTemplate,
} from "@/lib/email/templates/base";

export function completionRequestEmail(
  data: BookingEmailData & { autoCompleteHours: number },
): { subject: string; html: string } {
  const name = data.customer_name.trim() || "there";
  const confirmUrl = `${data.app_url.replace(/\/$/, "")}/bookings/lookup?${new URLSearchParams({
    ref: data.reference,
    email: data.customer_email,
  }).toString()}`;

  const content = `
    ${emailHeading("Please Confirm Your Journey")}
    ${emailParagraph(`Hi ${escapeHtml(name)}, your operator has marked this journey as complete.`)}
    ${referenceBadge(data.reference)}
    ${sectionLabel("Journey")}
    ${detailTable([
      { label: "Pickup", value: escapeHtml(data.pickup_address) },
      { label: "Dropoff", value: escapeHtml(data.dropoff_address) },
      {
        label: "Date & time",
        value: escapeHtml(formatDateDisplay(data.pickup_date, data.pickup_time)),
      },
      { label: "Operator", value: escapeHtml(data.operator_name) },
    ])}
    ${emailParagraph("Please confirm completion if everything went well, or raise a dispute if there was a problem.")}
    ${ctaButton(confirmUrl, "Confirm Completion")}
    ${emailParagraph(`<strong>Auto-completes in ${data.autoCompleteHours} hour${data.autoCompleteHours === 1 ? "" : "s"} if no action is taken.</strong>`)}
  `;

  return {
    subject: `Confirm your journey — ${data.reference}`,
    html: wrapEmailTemplate(
      content,
      `Please confirm journey ${data.reference}. Auto-completes in ${data.autoCompleteHours} hours.`,
    ),
  };
}
