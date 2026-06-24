"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useOptionalCookieConsent } from "@/components/cookies/CookieConsentProvider";

const TAWK_SCRIPT_SRC =
  "https://embed.tawk.to/6a27fccb06db241c2bc34e0d/1jqm36umk";

function removeTawkWidget(): void {
  document.querySelector('script[src*="tawk.to"]')?.remove();
  document.getElementById("tawk-bubble-container")?.remove();
  document.querySelector(".tawk-min-container")?.remove();
  delete window.Tawk_API;
  delete window.Tawk_LoadStart;
}

export function TawkToWidget() {
  const pathname = usePathname();
  const consent = useOptionalCookieConsent();
  const isStaff =
    pathname.startsWith("/admin") || pathname.startsWith("/operator");
  const isReady = consent?.isReady === true;
  const hasFunctionalConsent = consent?.hasFunctionalConsent === true;

  useEffect(() => {
    if (!isReady) return;

    if (isStaff || !hasFunctionalConsent) {
      removeTawkWidget();
      return;
    }

    if (document.querySelector('script[src*="tawk.to"]')) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = TAWK_SCRIPT_SRC;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);

    return () => {
      removeTawkWidget();
    };
  }, [hasFunctionalConsent, isReady, isStaff]);

  return null;
}
