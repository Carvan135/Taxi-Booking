export const COOKIE_CONSENT_VERSION = 1;

export const COOKIE_CONSENT_STORAGE_KEY = "airporthub_cookie_consent";

export const COOKIE_CONSENT_COOKIE_NAME = "airporthub_cookie_consent";

/** Non-essential categories that require opt-in under UK PECR / GDPR. */
export type CookieConsentCategories = {
  functional: boolean;
  analytics: boolean;
};

export type CookieConsentRecord = {
  version: number;
  essential: true;
  functional: boolean;
  analytics: boolean;
  decidedAt: string;
};

export const DEFAULT_COOKIE_CONSENT: CookieConsentCategories = {
  functional: false,
  analytics: false,
};

export function parseCookieConsent(raw: string | null): CookieConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (parsed.essential !== true) return null;
    if (typeof parsed.functional !== "boolean") return null;
    if (typeof parsed.analytics !== "boolean") return null;
    if (typeof parsed.decidedAt !== "string") return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      essential: true,
      functional: parsed.functional,
      analytics: parsed.analytics,
      decidedAt: parsed.decidedAt,
    };
  } catch {
    return null;
  }
}

export function buildConsentRecord(
  categories: CookieConsentCategories,
): CookieConsentRecord {
  return {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    functional: categories.functional,
    analytics: categories.analytics,
    decidedAt: new Date().toISOString(),
  };
}

export function consentAcceptAll(): CookieConsentRecord {
  return buildConsentRecord({ functional: true, analytics: true });
}

export function consentRejectNonEssential(): CookieConsentRecord {
  return buildConsentRecord(DEFAULT_COOKIE_CONSENT);
}
