import { getRuntimeEnv } from "@/lib/env/runtime";

/** Display name for branded transactional emails (matches RESEND_FROM_NAME). */
export function getEmailBrandName(): string {
  return getRuntimeEnv("RESEND_FROM_NAME") || "AirportHub";
}
