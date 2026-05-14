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
  id: string;
  type: string | null;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  disabled_reason: string | null;
  currently_due: string[];
  eventually_due: string[];
  past_due: string[];
  pending_verification: string[];
  errors: { code?: string; reason?: string; requirement?: string }[];
};

type ConnectStatusPayload = {
  operator: OperatorSnapshot;
  stripe: StripeRequirements | null;
  stripe_error?: string;
};

function StepRow({
  done,
  label,
  detail,
}: {
  done: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-emerald-600 text-white"
            : "border border-slate-300 bg-white text-slate-400"
        }`}
        aria-hidden
      >
        {done ? "✓" : ""}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-content">{label}</p>
        {detail ? (
          <p className="mt-0.5 text-xs text-content/70">{detail}</p>
        ) : null}
      </div>
    </li>
  );
}

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
        Loading your onboarding status…
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
    <div className="space-y-6">
      {data.stripe_error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {data.stripe_error}
        </p>
      ) : null}

      <ol className="space-y-2">
        <StepRow
          done={operator.status === "approved"}
          label="1. Operator application"
          detail={
            operator.status === "pending"
              ? "Under review — usually 24–48 hours."
              : operator.status === "approved"
                ? "Approved — you can set up payouts."
                : operator.status === "rejected"
                  ? "Not approved. Contact support if you have questions."
                  : operator.status === "suspended"
                    ? "Suspended. Contact support."
                    : `Status: ${operator.status}`}
        />
        <StepRow
          done={hasAccount}
          label="2. Stripe Connect account"
          detail={
            hasAccount
              ? `Connected account ${operator.stripe_account_id}.`
              : approved
                ? "Create your Stripe Express account to receive bank payouts."
                : "Available once your application is approved."
          }
        />
        <StepRow
          done={detailsOk}
          label="3. Identity & bank details in Stripe"
          detail={
            detailsOk
              ? "Submitted to Stripe."
              : hasAccount
                ? "Finish or update your details in Stripe’s secure flow."
                : "Opens after step 2."
          }
        />
        <StepRow
          done={payoutsOk}
          label="4. Payouts enabled"
          detail={
            payoutsOk
              ? operator.stripe_connected_at
                ? `Payouts active since ${new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeZone: "Europe/London",
                  }).format(new Date(operator.stripe_connected_at))}.`
                : "Payouts are enabled for your account."
              : detailsOk
                ? "Stripe is verifying your information — often 1–2 business days."
                : "Completes after Stripe verification."
          }
        />
      </ol>

      {stripe?.disabled_reason ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <strong className="font-semibold">Stripe:</strong>{" "}
          {stripe.disabled_reason.replace(/_/g, " ")}
        </div>
      ) : null}

      {(stripe?.currently_due?.length ||
        stripe?.past_due?.length ||
        stripe?.pending_verification?.length ||
        stripe?.eventually_due?.length) ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-primary">
            Outstanding from Stripe
          </h3>
          {stripe?.past_due?.length ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Past due
              </p>
              <ul className="mt-1 list-inside list-disc font-mono text-xs text-content/90">
                {stripe.past_due.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {stripe?.currently_due?.length ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Currently due
              </p>
              <ul className="mt-1 list-inside list-disc font-mono text-xs text-content/90">
                {stripe.currently_due.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {stripe?.pending_verification?.length ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Pending verification
              </p>
              <ul className="mt-1 list-inside list-disc font-mono text-xs text-content/90">
                {stripe.pending_verification.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {stripe?.eventually_due?.length ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Eventually due
              </p>
              <ul className="mt-1 list-inside list-disc font-mono text-xs text-content/70">
                {stripe.eventually_due.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {stripe?.errors?.length ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-red-800">Errors</p>
              <ul className="mt-1 space-y-1 text-xs text-red-900">
                {stripe.errors.map((e, i) => (
                  <li key={`${e.code ?? i}-${e.requirement ?? ""}`}>
                    {e.reason ?? e.code ?? "Verification issue"}
                    {e.requirement ? ` — ${e.requirement}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-content/80">
          {canUseStripe && !payoutsOk ? (
            <p>
              Use Stripe’s hosted flow to add or update bank details securely.
              You can return here anytime to check verification progress.
            </p>
          ) : payoutsOk ? (
            <p className="text-emerald-900">
              You&apos;re fully set up for payouts. Payout history lives under
              the <strong className="font-semibold">Payouts</strong> tab.
            </p>
          ) : (
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
          )}
        </div>
        {canUseStripe && !payoutsOk ? (
          <ConnectStripeButton returnPath="/operator/finances" />
        ) : null}
      </div>
    </div>
  );
}
