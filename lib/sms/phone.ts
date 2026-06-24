/** Normalize UK booking phones to E.164 for Twilio. */
export function toE164UkPhone(phone: string): string | null {
  const compact = phone.replace(/[\s-()]/g, "");
  if (!compact) return null;
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("0")) return `+44${compact.slice(1)}`;
  if (compact.startsWith("44")) return `+${compact}`;
  return null;
}
