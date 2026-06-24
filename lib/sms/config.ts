export function getTwilioAccountSid(): string | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  return sid || null;
}

export function getTwilioAuthToken(): string | null {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  return token || null;
}

export function getTwilioPhoneNumber(): string | null {
  const phone = process.env.TWILIO_PHONE_NUMBER?.trim();
  return phone || null;
}

export function isSmsConfigured(): boolean {
  return (
    getTwilioAccountSid() !== null &&
    getTwilioAuthToken() !== null &&
    getTwilioPhoneNumber() !== null
  );
}
