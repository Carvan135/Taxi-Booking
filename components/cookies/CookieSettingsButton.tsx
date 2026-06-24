"use client";

import { useOptionalCookieConsent } from "@/components/cookies/CookieConsentProvider";

export function CookieSettingsButton() {
  const consent = useOptionalCookieConsent();

  if (!consent) return null;

  return (
    <button
      type="button"
      onClick={consent.openPreferences}
      className="text-sm text-slate-400 transition hover:text-white"
    >
      Cookie settings
    </button>
  );
}
