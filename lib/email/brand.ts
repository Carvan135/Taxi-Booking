/** Display name for branded transactional emails (matches RESEND_FROM_NAME). */
export function getEmailBrandName(): string {
  return process.env.RESEND_FROM_NAME?.trim() || "AirportHub";
}
