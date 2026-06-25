import { getRuntimeEnv } from "@/lib/env/runtime";

export function getTwilioAccountSid(): string | null {
  return getRuntimeEnv("TWILIO_ACCOUNT_SID") ?? null;
}

export function getTwilioAuthToken(): string | null {
  return getRuntimeEnv("TWILIO_AUTH_TOKEN") ?? null;
}

export function getTwilioPhoneNumber(): string | null {
  return getRuntimeEnv("TWILIO_PHONE_NUMBER") ?? null;
}

export function isSmsConfigured(): boolean {
  return (
    getTwilioAccountSid() !== null &&
    getTwilioAuthToken() !== null &&
    getTwilioPhoneNumber() !== null
  );
}
