"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function TawkToWidget() {
  const pathname = usePathname();
  const isStaff =
    pathname.startsWith("/admin") || pathname.startsWith("/operator");

  useEffect(() => {
    if (isStaff) return;
    const s1 = document.createElement("script");
    const s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = "https://embed.tawk.to/6a27fccb06db241c2bc34e0d/1jqm36umk";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s0.parentNode?.insertBefore(s1, s0);
    return () => {
      document.querySelector('script[src*="tawk.to"]')?.remove();
    };
  }, [isStaff]);

  return null;
}
