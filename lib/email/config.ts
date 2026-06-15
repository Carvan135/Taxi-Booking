/** Resend API key — required for transactional email. */
export function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || null;
}

export function isEmailConfigured(): boolean {
  return (
    getResendApiKey() !== null &&
    Boolean(process.env.RESEND_FROM_EMAIL?.trim())
  );
}

export function isResendApiKeyConfigured(): boolean {
  return getResendApiKey() !== null;
}

export function isResendFromEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_FROM_EMAIL?.trim());
}

/** Verified sender, e.g. `AirportHub <noreply@airporthub.co.uk>`. */
export function getEmailFromAddress(): string {
  const legacy = process.env.EMAIL_FROM?.trim();
  if (legacy) return legacy;

  const name = process.env.RESEND_FROM_NAME?.trim() || "AirportHub";
  const email =
    process.env.RESEND_FROM_EMAIL?.trim() || "noreply@airporthub.co.uk";
  return `${name} <${email}>`;
}
