"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useOptionalCookieConsent } from "@/components/cookies/CookieConsentProvider";

const TAWK_SCRIPT_SRC =
  "https://embed.tawk.to/6a27fccb06db241c2bc34e0d/1jqm36umk";

type TawkApi = {
  onLoad?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

function removeTawkWidget(): void {
  document.body.classList.remove("tawk-widget-active");
  document.querySelector('script[src*="tawk.to"]')?.remove();
  document.getElementById("tawk-bubble-container")?.remove();
  document.querySelector(".tawk-min-container")?.remove();
  delete window.Tawk_API;
  delete window.Tawk_LoadStart;
}

function armTawkWidgetActiveClass(): void {
  window.Tawk_API = window.Tawk_API || {};
  const previousOnLoad = window.Tawk_API.onLoad;
  window.Tawk_API.onLoad = function () {
    document.body.classList.add("tawk-widget-active");
    previousOnLoad?.();
  };
}

export function TawkToWidget() {
  const pathname = usePathname();
  const consent = useOptionalCookieConsent();
  const isStaff =
    pathname.startsWith("/admin") || pathname.startsWith("/operator");
  const hideOnCheckout =
    pathname.startsWith("/payment") ||
    pathname.startsWith("/confirmation") ||
    pathname.startsWith("/complete-payment");
  const isReady = consent?.isReady === true;
  const hasFunctionalConsent = consent?.hasFunctionalConsent === true;

  useEffect(() => {
    if (!isReady) return;

    if (isStaff || hideOnCheckout || !hasFunctionalConsent) {
      removeTawkWidget();
      return;
    }

    if (document.querySelector('script[src*="tawk.to"]')) {
      if (document.getElementById("tawk-bubble-container")) {
        document.body.classList.add("tawk-widget-active");
      }
      return;
    }

    armTawkWidgetActiveClass();

    const script = document.createElement("script");
    script.async = true;
    script.src = TAWK_SCRIPT_SRC;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);

    return () => {
      removeTawkWidget();
    };
  }, [hasFunctionalConsent, hideOnCheckout, isReady, isStaff]);

  return null;
}
