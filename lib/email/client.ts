import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY?.trim();
if (!apiKey) throw new Error("Missing RESEND_API_KEY");

export const resend = new Resend(apiKey);

const fromName = process.env.RESEND_FROM_NAME?.trim() || "AirportHub";
const fromEmail =
  process.env.RESEND_FROM_EMAIL?.trim() || "noreply@airporthub.co.uk";

export const EMAIL_FROM = `${fromName} <${fromEmail}>`;
