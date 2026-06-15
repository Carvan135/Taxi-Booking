import { Resend } from "resend";
import { getEmailFromAddress, getResendApiKey } from "@/lib/email/config";

let resendClient: Resend | null = null;

/** Lazy Resend client — avoids throwing during Next.js build when env is unset. */
export function getResendClient(): Resend {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function getEmailFrom(): string {
  return getEmailFromAddress();
}
