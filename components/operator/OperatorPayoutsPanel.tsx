"use client";

import { useEffect, useState } from "react";
import { PLACEHOLDER } from "@/lib/format/display";

type PayoutRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: number | null;
  created: number;
  description: string | null;
  failure_message: string | null;
  method: string | null;
};

function formatMoney(amount: number, currency: string): string {
  const c = currency.toLowerCase();
  const major = amount / 100;
  if (c === "gbp") {
    return `£${major.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${major.toFixed(2)} ${currency.toUpperCase()}`;
}

function formatUnix(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return PLACEHOLDER;
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(new Date(ms));
}

function statusStyles(status: string): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-900";
    case "pending":
      return "bg-amber-100 text-amber-950";
    case "in_transit":
      return "bg-sky-100 text-sky-900";
    case "failed":
    case "canceled":
      return "bg-red-100 text-red-900";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function OperatorPayoutsPanel() {
  const [payouts, setPayouts] = useState<PayoutRow[] | null>(null);
  const [hasAccount, setHasAccount] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/operator/stripe-payouts?limit=30");
        const json = (await res.json()) as {
          payouts?: PayoutRow[];
          has_account?: boolean;
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) setErr(json.error ?? "Could not load payouts");
          return;
        }
        if (!cancelled) {
          setHasAccount(json.has_account !== false);
          setPayouts(json.payouts ?? []);
        }
      } catch {
        if (!cancelled) setErr("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-content/70">Loading payout history…</p>
    );
  }

  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
        {err}
      </div>
    );
  }

  if (!hasAccount) {
    return (
      <p className="text-sm text-content/70">
        Finish Stripe onboarding first. Your payout history will appear here
        once a connected account exists.
      </p>
    );
  }

  if (!payouts?.length) {
    return (
      <p className="text-sm text-content/70">
        No payouts yet. Stripe creates payouts on a schedule once you have a
        positive balance from completed trips.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-content/70">
          <tr>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Arrival</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {payouts.map((p) => (
            <tr key={p.id}>
              <td className="whitespace-nowrap px-4 py-3 text-content/90">
                {formatUnix(p.created)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-content/90">
                {formatUnix(p.arrival_date)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-content">
                {formatMoney(p.amount, p.currency)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles(p.status)}`}
                >
                  {p.status.replace(/_/g, " ")}
                </span>
              </td>
              <td className="max-w-[220px] px-4 py-3 text-xs text-content/75">
                {p.failure_message ? (
                  <span className="text-red-700">{p.failure_message}</span>
                ) : p.description ? (
                  p.description
                ) : p.method ? (
                  <span className="capitalize">{p.method}</span>
                ) : (
                  PLACEHOLDER
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
