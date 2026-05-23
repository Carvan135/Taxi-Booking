"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type OperatorFinancesSummaryCardsProps = {
  availableTotal: number;
  availableCount: number;
  canWithdraw: boolean;
  withdrawBlockReason: string | null;
  futureTotal: number;
  futureActiveAmount: number;
  futureClearingAmount: number;
  futureActiveCount: number;
  futureClearingCount: number;
  earningsToDate: number;
  earningsToDateCount: number;
};

function formatMoney(n: number): string {
  return `£${n.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function SummaryCard({
  title,
  amount,
  description,
  children,
  variant = "default",
}: {
  title: string;
  amount: string;
  description: string;
  children?: ReactNode;
  variant?: "default" | "emerald" | "sky" | "slate";
}) {
  const styles = {
    default: "border-slate-200/90 bg-white",
    emerald: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white",
    sky: "border-sky-200/80 bg-gradient-to-br from-sky-50/90 to-white",
    slate: "border-slate-200/90 bg-slate-50/80",
  };

  return (
    <article
      className={`flex h-full flex-col rounded-xl border p-5 shadow-sm ${styles[variant]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-content/60">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-primary">{amount}</p>
      <p className="mt-2 flex-1 text-sm text-content/70">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </article>
  );
}

export function OperatorFinancesSummaryCards({
  availableTotal,
  availableCount,
  canWithdraw,
  withdrawBlockReason,
  futureTotal,
  futureActiveAmount,
  futureClearingAmount,
  futureActiveCount,
  futureClearingCount,
  earningsToDate,
  earningsToDateCount,
}: OperatorFinancesSummaryCardsProps) {
  const router = useRouter();
  const [available, setAvailable] = useState(availableTotal);
  const [availableTrips, setAvailableTrips] = useState(availableCount);
  const [canWithdrawState, setCanWithdrawState] = useState(canWithdraw);
  const [blockReason, setBlockReason] = useState(withdrawBlockReason);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleWithdraw() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/operator/withdraw-earnings", {
        method: "POST",
      });
      const json = (await res.json()) as {
        success?: boolean;
        released?: number;
        total_amount?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not withdraw earnings");
      }
      setSuccess(
        `Withdrew ${formatMoney(json.total_amount ?? 0)} from ${json.released ?? 0} trip${(json.released ?? 0) === 1 ? "" : "s"}.`,
      );
      setAvailable(0);
      setAvailableTrips(0);
      setCanWithdrawState(false);
      setBlockReason(
        "No balance available yet. Funds appear here after completed trips pass the payout waiting period.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Withdraw failed");
    } finally {
      setLoading(false);
    }
  }

  const futureDetail =
    futureTotal <= 0
      ? "No funds currently clearing or tied to active trips."
      : [
          futureActiveCount > 0
            ? `${formatMoney(futureActiveAmount)} from ${futureActiveCount} active paid trip${futureActiveCount === 1 ? "" : "s"}`
            : null,
          futureClearingCount > 0
            ? `${formatMoney(futureClearingAmount)} from ${futureClearingCount} completed trip${futureClearingCount === 1 ? "" : "s"} still clearing`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          title="Balance available for use"
          amount={formatMoney(available)}
          description={
            availableTrips === 0
              ? "Ready to withdraw once completed trips pass the payout waiting period."
              : `${availableTrips} completed trip${availableTrips === 1 ? "" : "s"} ready to withdraw.`
          }
          variant="emerald"
        >
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="w-full bg-emerald-700 hover:opacity-95"
            loading={loading}
            disabled={!canWithdrawState || loading}
            onClick={() => void handleWithdraw()}
          >
            Withdraw
          </Button>
          {blockReason && !canWithdrawState ? (
            <p className="mt-2 text-xs text-content/60">{blockReason}</p>
          ) : null}
        </SummaryCard>

        <SummaryCard
          title="Future payments"
          amount={formatMoney(futureTotal)}
          description="These funds are payments being cleared and payments for active bookings."
          variant="sky"
        >
          <p className="text-xs text-sky-900/80">{futureDetail}</p>
        </SummaryCard>

        <SummaryCard
          title="Earnings to date"
          amount={formatMoney(earningsToDate)}
          description={
            earningsToDateCount === 0
              ? "Total from all completed trips on your account."
              : `Total from ${earningsToDateCount} completed trip${earningsToDateCount === 1 ? "" : "s"} (lifetime).`
          }
          variant="slate"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-emerald-900" role="status">
          {success}
        </p>
      ) : null}
    </div>
  );
}
