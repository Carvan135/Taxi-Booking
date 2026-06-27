"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectStripeButton } from "@/components/operator/ConnectStripeButton";
import type { OperatorStatus } from "@/types";

type OperatorSnapshot = {
  id: string;
  status: OperatorStatus;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_payouts_enabled: boolean;
  stripe_connected_at: string | null;
};

type StripeRequirements = {
  details_submitted: boolean;
  payouts_enabled: boolean;
  disabled_reason: string | null;
};

type ConnectStatusPayload = {
  operator: OperatorSnapshot;
  stripe: StripeRequirements | null;
  stripe_error?: string;
};

export function OperatorOnboardingPanel() {
  const [data, setData] = useState<ConnectStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/operator/stripe-connect-status");
        const json = (await res.json()) as ConnectStatusPayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setErr(json.error ?? "Could not load status");
          return;
        }
        if (!cancelled) setData(json);
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
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-content/70">
        Loading payout setup…
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        {err ?? "Something went wrong."}
      </div>
    );
  }

  const { operator, stripe } = data;
  const approved = operator.status === "approved";
  const hasAccount = Boolean(operator.stripe_account_id);
  const detailsOk =
    stripe?.details_submitted ?? operator.stripe_onboarding_complete;
  const payoutsOk =
    stripe?.payouts_enabled ?? operator.stripe_payouts_enabled;
  const canUseStripe = approved;

  return (
    <div className="space-y-4">
      {data.stripe_error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {data.stripe_error}
        </p>
      ) : null}

      {stripe?.disabled_reason ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <strong className="font-semibold">Stripe:</strong>{" "}
          {stripe.disabled_reason.replace(/_/g, " ")}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm text-content/80">
          {!approved ? (
            <p>
              Complete your{" "}
              <Link
                href="/operator/profile"
                className="font-semibold text-secondary underline-offset-2 hover:underline"
              >
                profile
              </Link>{" "}
              and wait for approval before connecting Stripe.
            </p>
          ) : payoutsOk ? (
            <p className="text-emerald-900">
              Payouts are enabled
              {operator.stripe_connected_at
                ? ` since ${new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeZone: "Europe/London",
                  }).format(new Date(operator.stripe_connected_at))}`
                : ""}
              . Payout history is under the{" "}
              <strong className="font-semibold">Payouts</strong> tab.
            </p>
          ) : !hasAccount ? (
            <p>
              Connect your bank account through Stripe so we can pay you for
              completed trips. You&apos;ll complete identity and bank details in
              Stripe&apos;s secure flow.
            </p>
          ) : detailsOk ? (
            <p>
              Stripe is verifying your information — often 1–2 business days.
              You can return here anytime to check progress or update details.
            </p>
          ) : (
            <p>
              Finish identity and bank details in Stripe&apos;s secure flow. You
              can return here anytime to update your payout information.
            </p>
          )}
        </div>

        {canUseStripe && !payoutsOk ? (
          <div className="mt-4">
            <ConnectStripeButton returnPath="/operator/finances" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
