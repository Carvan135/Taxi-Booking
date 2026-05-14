"use client";

import { useEffect } from "react";

/** Removes `?stripe=success` after load so refresh does not repeat return messaging. */
export function ClearStripeReturnQuery() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("stripe") !== "success") return;
    url.searchParams.delete("stripe");
    const qs = url.searchParams.toString();
    const next = `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
    window.history.replaceState({}, "", next);
  }, []);

  return null;
}
