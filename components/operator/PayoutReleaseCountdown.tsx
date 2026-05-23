"use client";

import { useEffect, useState } from "react";
import {
  formatPayoutReleaseCountdown,
  payoutReleaseStatus,
  type PayoutReleaseSnapshot,
} from "@/lib/booking/payout-release-display";

type PayoutReleaseCountdownProps = PayoutReleaseSnapshot;

function formatReleasedAt(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function PayoutReleaseCountdown({
  payout_eligible_at,
  payout_released_at,
}: PayoutReleaseCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const status = payoutReleaseStatus(
    { payout_eligible_at, payout_released_at },
    now,
  );

  if (status === "released" && payout_released_at) {
    return (
      <span className="font-medium text-emerald-700">
        Released
        <span className="mt-0.5 block text-xs font-normal text-emerald-600/90">
          {formatReleasedAt(payout_released_at)}
        </span>
      </span>
    );
  }

  if (status === "pending") {
    return <span className="text-content/50">—</span>;
  }

  if (status === "ready") {
    return (
      <span className="font-medium text-amber-800">
        Eligible now
        <span className="mt-0.5 block text-xs font-normal text-amber-700/90">
          Awaiting payout release
        </span>
      </span>
    );
  }

  if (payout_eligible_at) {
    return (
      <span className="font-medium text-sky-900">
        {formatPayoutReleaseCountdown(payout_eligible_at, now)}
        <span className="mt-0.5 block text-xs font-normal text-sky-800/80">
          Until payout eligible
        </span>
      </span>
    );
  }

  return <span className="text-content/50">—</span>;
}
