"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useOptionalCookieConsent } from "@/components/cookies/CookieConsentProvider";
import { SITE_EMAILS } from "@/lib/site/contact";

type TawkApi = {
  onLoad?: () => void;
  maximize?: () => void;
  toggle?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

function openTawkChat() {
  if (typeof window === "undefined") return;
  const api = window.Tawk_API;
  if (api?.maximize) {
    api.maximize();
    return;
  }
  if (api?.toggle) {
    api.toggle();
  }
}

type OpenTawkChatButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export function OpenTawkChatButton({
  className = "",
  children = "Start live chat",
}: OpenTawkChatButtonProps) {
  const consent = useOptionalCookieConsent();

  if (consent && !consent.hasFunctionalConsent) {
    return (
      <Button
        type="button"
        variant="primary"
        className={className}
        onClick={consent.openPreferences}
      >
        <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
        Enable chat cookies
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="primary"
      className={className}
      onClick={() => {
        if (window.Tawk_API?.maximize || window.Tawk_API?.toggle) {
          openTawkChat();
          return;
        }
        window.location.href = `mailto:${SITE_EMAILS.support}`;
      }}
    >
      <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
      {children}
    </Button>
  );
}
