import twilio from "twilio";
import {
  getTwilioAccountSid,
  getTwilioAuthToken,
  getTwilioPhoneNumber,
} from "@/lib/sms/config";

let twilioClient: ReturnType<typeof twilio> | null = null;

/** Lazy Twilio client — avoids throwing during Next.js build when env is unset. */
export function getTwilioClient(): ReturnType<typeof twilio> {
  const accountSid = getTwilioAccountSid();
  const authToken = getTwilioAuthToken();
  if (!accountSid || !authToken) {
    throw new Error("Missing Twilio credentials");
  }
  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

export function getTwilioFrom(): string {
  const from = getTwilioPhoneNumber();
  if (!from) {
    throw new Error("Missing TWILIO_PHONE_NUMBER");
  }
  return from;
}
