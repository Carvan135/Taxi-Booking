import {
  COOKIE_CONSENT_COOKIE_NAME,
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentRecord,
} from "@/lib/cookies/consent";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function serializeConsent(record: CookieConsentRecord): string {
  return JSON.stringify(record);
}

/** Persist consent in localStorage (client reads) and a first-party cookie. */
export function persistCookieConsent(record: CookieConsentRecord): void {
  if (typeof window === "undefined") return;

  const payload = serializeConsent(record);
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, payload);

  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${encodeURIComponent(payload)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}

export function readStoredCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;

  const fromStorage = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (fromStorage) {
    try {
      return JSON.parse(fromStorage) as CookieConsentRecord;
    } catch {
      // fall through
    }
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_CONSENT_COOKIE_NAME}=`));
  if (!match) return null;

  try {
    const value = decodeURIComponent(match.split("=").slice(1).join("="));
    return JSON.parse(value) as CookieConsentRecord;
  } catch {
    return null;
  }
}
