"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";
import {
  buildConsentRecord,
  consentAcceptAll,
  consentRejectNonEssential,
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION,
  DEFAULT_COOKIE_CONSENT,
  parseCookieConsent,
  type CookieConsentCategories,
  type CookieConsentRecord,
} from "@/lib/cookies/consent";
import { persistCookieConsent } from "@/lib/cookies/storage";

type CookieConsentContextValue = {
  consent: CookieConsentRecord | null;
  hasDecided: boolean;
  hasFunctionalConsent: boolean;
  hasAnalyticsConsent: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (categories: CookieConsentCategories) => void;
  openPreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
);

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}

export function useOptionalCookieConsent(): CookieConsentContextValue | null {
  return useContext(CookieConsentContext);
}

function CookiePreferencesPanel({
  draft,
  onChange,
  onSave,
  onClose,
}: {
  draft: CookieConsentCategories;
  onChange: (next: CookieConsentCategories) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-preferences-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2
            id="cookie-preferences-title"
            className="text-lg font-bold text-primary"
          >
            Cookie preferences
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-content/75">
            Choose which optional cookies we may use. Essential cookies are
            always active because they are required for the site to work.
          </p>
        </div>

        <div className="space-y-4 px-5 py-4 sm:px-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-content">Essential</p>
                <p className="mt-1 text-xs leading-relaxed text-content/70">
                  Sign-in sessions, booking flow security, and remembering your
                  cookie choices.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-content/70">
                Always on
              </span>
            </div>
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-content">Functional</p>
              <p className="mt-1 text-xs leading-relaxed text-content/70">
                Live chat (Tawk.to) so you can reach support from the site.
              </p>
            </div>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-secondary focus:ring-secondary"
              checked={draft.functional}
              onChange={(e) =>
                onChange({ ...draft, functional: e.target.checked })
              }
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-content">Analytics</p>
              <p className="mt-1 text-xs leading-relaxed text-content/70">
                Anonymous usage statistics to help us improve AirportHub. Not
                currently used — reserved for future analytics tools.
              </p>
            </div>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-secondary focus:ring-secondary"
              checked={draft.analytics}
              onChange={(e) =>
                onChange({ ...draft, analytics: e.target.checked })
              }
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={onSave}>
            Save preferences
          </Button>
        </div>
      </div>
    </div>
  );
}

function CookieConsentBanner({
  onAcceptAll,
  onReject,
  onManage,
}: {
  onAcceptAll: () => void;
  onReject: () => void;
  onManage: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-slate-200 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h2
            id="cookie-banner-title"
            className="text-base font-bold text-primary sm:text-lg"
          >
            We use cookies
          </h2>
          <p
            id="cookie-banner-desc"
            className="mt-2 text-sm leading-relaxed text-content/80"
          >
            We use essential cookies to run AirportHub and optional cookies for
            live chat support. You can accept all, reject non-essential cookies,
            or manage your preferences. See our{" "}
            <Link href="/cookies" className="font-medium text-secondary hover:underline">
              Cookie Policy
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-secondary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onManage}>
            Manage preferences
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onReject}>
            Reject non-essential
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onAcceptAll}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [draft, setDraft] = useState<CookieConsentCategories>(
    DEFAULT_COOKIE_CONSENT,
  );

  useEffect(() => {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    const parsed = parseCookieConsent(raw);
    setConsent(parsed);
    setShowBanner(!parsed);
    if (parsed) {
      setDraft({
        functional: parsed.functional,
        analytics: parsed.analytics,
      });
    }
    setHydrated(true);
  }, []);

  const applyConsent = useCallback((record: CookieConsentRecord) => {
    persistCookieConsent(record);
    setConsent(record);
    setDraft({
      functional: record.functional,
      analytics: record.analytics,
    });
    setShowBanner(false);
    setShowPreferences(false);
  }, []);

  const acceptAll = useCallback(() => {
    applyConsent(consentAcceptAll());
  }, [applyConsent]);

  const rejectNonEssential = useCallback(() => {
    applyConsent(consentRejectNonEssential());
  }, [applyConsent]);

  const savePreferences = useCallback(
    (categories: CookieConsentCategories) => {
      applyConsent(buildConsentRecord(categories));
    },
    [applyConsent],
  );

  const openPreferences = useCallback(() => {
    setDraft({
      functional: consent?.functional ?? false,
      analytics: consent?.analytics ?? false,
    });
    setShowPreferences(true);
    setShowBanner(false);
  }, [consent]);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      hasDecided: consent?.version === COOKIE_CONSENT_VERSION,
      hasFunctionalConsent: consent?.functional === true,
      hasAnalyticsConsent: consent?.analytics === true,
      acceptAll,
      rejectNonEssential,
      savePreferences,
      openPreferences,
    }),
    [acceptAll, consent, openPreferences, rejectNonEssential, savePreferences],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {hydrated && showBanner ? (
        <CookieConsentBanner
          onAcceptAll={acceptAll}
          onReject={rejectNonEssential}
          onManage={openPreferences}
        />
      ) : null}
      {hydrated && showPreferences ? (
        <CookiePreferencesPanel
          draft={draft}
          onChange={setDraft}
          onSave={() => savePreferences(draft)}
          onClose={() => {
            setShowPreferences(false);
            if (!consent) setShowBanner(true);
          }}
        />
      ) : null}
    </CookieConsentContext.Provider>
  );
}
