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
  const hasFunctionalConsent = consent?.hasFunctionalConsent === true;

  useEffect(() => {
    if (isStaff || !hasFunctionalConsent) {
      removeTawkWidget();
      return;
    }

    if (document.querySelector('script[src*="tawk.to"]')) return;

    const s1 = document.createElement("script");
    const s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = TAWK_SCRIPT_SRC;
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s0.parentNode?.insertBefore(s1, s0);

    return () => {
      removeTawkWidget();
    };
  }, [hasFunctionalConsent, isStaff]);

  return null;
}
