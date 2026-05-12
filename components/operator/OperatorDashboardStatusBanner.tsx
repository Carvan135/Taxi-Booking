"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_PREFIX = "operatorDashboardStatusBanner:";

function storageKey(bannerId: string): string {
  return `${STORAGE_PREFIX}${bannerId}`;
}

function readDismissed(bannerId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey(bannerId)) === "1";
  } catch {
    return false;
  }
}

type OperatorDashboardStatusBannerProps = {
  /** Dismiss state is tracked per variant (e.g. pending vs approved). */
  bannerId: string;
  className?: string;
  children: React.ReactNode;
};

export function OperatorDashboardStatusBanner({
  bannerId,
  className = "",
  children,
}: OperatorDashboardStatusBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed(bannerId));
  }, [bannerId]);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey(bannerId), "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (dismissed) {
    return null;
  }

  return (
    <div className={`relative ${className}`.trim()}>
      <div className="pr-10">{children}</div>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-lg p-1.5 text-current/60 transition hover:bg-black/5 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
        aria-label="Dismiss message"
      >
        <X className="h-4 w-4 shrink-0" aria-hidden />
      </button>
    </div>
  );
}
