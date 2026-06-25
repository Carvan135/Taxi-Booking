import { getRuntimeEnv } from "@/lib/env/runtime";

/** Resend API key — required for transactional email. */
export function getResendApiKey(): string | null {
  return getRuntimeEnv("RESEND_API_KEY") ?? null;
}

export function isEmailConfigured(): boolean {
  return getResendApiKey() !== null && isResendFromEmailConfigured();
}

export function isResendApiKeyConfigured(): boolean {
  return getResendApiKey() !== null;
}

export function isResendFromEmailConfigured(): boolean {
  return Boolean(getRuntimeEnv("RESEND_FROM_EMAIL"));
}

/** Verified sender, e.g. `AirportHub <noreply@airporthub.co.uk>`. */
export function getEmailFromAddress(): string {
  const legacy = getRuntimeEnv("EMAIL_FROM");
  if (legacy) return legacy;

  const name = getRuntimeEnv("RESEND_FROM_NAME") || "AirportHub";
  const email = getRuntimeEnv("RESEND_FROM_EMAIL") || "noreply@airporthub.co.uk";
  return `${name} <${email}>`;
}
