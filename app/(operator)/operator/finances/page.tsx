import Link from "next/link";
import { redirect } from "next/navigation";
import { ClearStripeReturnQuery } from "@/components/operator/ClearStripeReturnQuery";
import {
  FinancesTabNav,
  type FinancesTab,
} from "@/components/operator/FinancesTabNav";
import { OperatorOnboardingPanel } from "@/components/operator/OperatorOnboardingPanel";
import { OperatorPayoutsPanel } from "@/components/operator/OperatorPayoutsPanel";
import { PayoutReleaseCountdown } from "@/components/operator/PayoutReleaseCountdown";
import { OperatorFinancesSummaryCards } from "@/components/operator/OperatorFinancesSummaryCards";
import { getOperatorFinancesSummary } from "@/lib/operator/operator-finances-summary";
import { canReceivePayout } from "@/lib/stripe/payoutGuard";
import { ukCalendarDayRangeToUtcIso } from "@/lib/booking/uk-pickup-time";
import { PLACEHOLDER } from "@/lib/format/display";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "@/types";
import { Wallet } from "lucide-react";

function londonTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseYmd(value: string | string[] | undefined, fallback: string): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return fallback;
}

function minusCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const u = Date.UTC(y, m - 1, d - days);
  return new Date(u).toISOString().slice(0, 10);
}

function parseTab(value: string | string[] | undefined): FinancesTab {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "earnings" || v === "payouts" || v === "onboarding") return v;
  return "earnings";
}

type EarningsRow = {
  id: string;
  reference: string;
  completed_at: string | null;
  price: number | null;
  operator_payout: number | null;
  payment_status: PaymentStatus;
  payout_eligible_at: string | null;
  payout_released_at: string | null;
};

function formatCompletedAt(iso: string | null): string {
  if (!iso) return PLACEHOLDER;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function earningsAmount(row: EarningsRow): number {
  return Number(row.operator_payout ?? row.price ?? 0);
}

function stripeReturnSuccess(
  searchParams?: Record<string, string | string[] | undefined>,
): boolean {
  const v = searchParams?.stripe;
  if (v === "success") return true;
  if (Array.isArray(v)) return v.includes("success");
  return false;
}

function formatMoney(n: number): string {
  return `£${n.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default async function OperatorFinancesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tab = parseTab(searchParams?.tab);
  const today = londonTodayYmd();
  const defaultFrom = minusCalendarDays(today, 30);
  let from = parseYmd(searchParams?.from, defaultFrom);
  let to = parseYmd(searchParams?.to, today);
  if (from > to) {
    const t = from;
    from = to;
    to = t;
  }
  const fromStripeReturn = stripeReturnSuccess(searchParams);

  const { data: operator } = await supabase
    .from("operators")
    .select(
      "id, business_name, status, stripe_account_id, stripe_onboarding_complete, stripe_payouts_enabled, stripe_connected_at",
    )
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const showOnboardingTab =
    operator?.status === "approved" && operator.stripe_payouts_enabled !== true;

  if (tab === "onboarding" && !showOnboardingTab) {
    redirect("/operator/finances?tab=earnings");
  }

  let earningsRows: EarningsRow[] = [];
  let summary = {
    availableTotal: 0,
    availableCount: 0,
    canWithdraw: false,
    withdrawBlockReason: null as string | null,
    futureTotal: 0,
    futureActiveAmount: 0,
    futureClearingAmount: 0,
    futureActiveCount: 0,
    futureClearingCount: 0,
    earningsToDate: 0,
    earningsToDateCount: 0,
  };

  if (operator?.id && tab === "earnings") {
    const finances = await getOperatorFinancesSummary(supabase, operator.id);
    const guard = await canReceivePayout(operator.id);
    summary = {
      availableTotal: finances.available.totalAmount,
      availableCount: finances.available.count,
      canWithdraw: guard.allowed && finances.available.count > 0,
      withdrawBlockReason: guard.allowed
        ? finances.available.count === 0
          ? "No balance available yet. Funds appear here after completed trips pass the payout waiting period."
          : null
        : (guard.reason ?? "Complete Stripe payout setup first."),
      futureTotal: finances.future.totalAmount,
      futureActiveAmount: finances.future.activeAmount,
      futureClearingAmount: finances.future.clearingAmount,
      futureActiveCount: finances.future.activeCount,
      futureClearingCount: finances.future.clearingCount,
      earningsToDate: finances.earningsToDate,
      earningsToDateCount: finances.earningsToDateCount,
    };

    const range = ukCalendarDayRangeToUtcIso(from, to);
    if (range) {
      const { data: rows } = await supabase
        .from("bookings")
        .select(
          "id, reference, completed_at, price, operator_payout, payment_status, payout_eligible_at, payout_released_at",
        )
        .eq("operator_id", operator.id)
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .gte("completed_at", range.startIso)
        .lte("completed_at", range.endIso)
        .order("completed_at", { ascending: false });

      earningsRows = (rows ?? []) as EarningsRow[];
    }
  }

  const earningsQuery = { from, to };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {fromStripeReturn ? <ClearStripeReturnQuery /> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-primary">
            <Wallet className="h-7 w-7 shrink-0 text-secondary" aria-hidden />
            Finances
          </h1>
          <p className="mt-1 text-sm text-content/70">
            Onboarding, trip earnings, and Stripe payout history.
          </p>
        </div>
        <Link
          href="/operator/dashboard"
          className="shrink-0 text-sm font-semibold text-secondary underline-offset-2 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>

      {fromStripeReturn ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          <strong className="font-semibold">Stripe:</strong> you returned from
          the secure flow. Status below updates when Stripe finishes processing.
        </div>
      ) : null}

      <FinancesTabNav
        active={tab}
        earningsQuery={earningsQuery}
        showOnboardingTab={showOnboardingTab}
      />

      <div className="mt-6 rounded-b-xl border border-t-0 border-slate-200 bg-white p-5 sm:p-6">
        {tab === "onboarding" ? (
          <section aria-labelledby="fin-onboarding-heading">
            <h2
              id="fin-onboarding-heading"
              className="text-lg font-semibold text-primary"
            >
              Payout setup
            </h2>
            <p className="mt-1 text-sm text-content/70">
              Connect Stripe to receive bank payouts for completed trips.
            </p>
            <div className="mt-5">
              <OperatorOnboardingPanel />
            </div>
          </section>
        ) : null}

        {tab === "earnings" ? (
          <section aria-labelledby="fin-earnings-heading">
            <h2
              id="fin-earnings-heading"
              className="text-lg font-semibold text-primary"
            >
              Earnings
            </h2>
            <p className="mt-1 text-sm text-content/70">
              Summary balances above; trip history below is filtered by
              completion date.
            </p>

            {!operator ? (
              <p className="mt-6 text-sm text-content/70">
                Complete your{" "}
                <Link
                  href="/operator/profile"
                  className="font-semibold text-secondary underline-offset-2 hover:underline"
                >
                  profile
                </Link>{" "}
                first. Earnings appear once you&apos;re set up as an operator.
              </p>
            ) : (
              <>
                <div className="mt-5">
                  <OperatorFinancesSummaryCards
                    availableTotal={summary.availableTotal}
                    availableCount={summary.availableCount}
                    canWithdraw={summary.canWithdraw}
                    withdrawBlockReason={summary.withdrawBlockReason}
                    futureTotal={summary.futureTotal}
                    futureActiveAmount={summary.futureActiveAmount}
                    futureClearingAmount={summary.futureClearingAmount}
                    futureActiveCount={summary.futureActiveCount}
                    futureClearingCount={summary.futureClearingCount}
                    earningsToDate={summary.earningsToDate}
                    earningsToDateCount={summary.earningsToDateCount}
                  />
                </div>

                <form
                  className="mt-5 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                  method="get"
                >
                  <input type="hidden" name="tab" value="earnings" />
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="earn-from"
                      className="text-xs font-semibold uppercase tracking-wide text-content/60"
                    >
                      Completed from
                    </label>
                    <input
                      id="earn-from"
                      name="from"
                      type="date"
                      defaultValue={from}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-content shadow-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="earn-to"
                      className="text-xs font-semibold uppercase tracking-wide text-content/60"
                    >
                      Completed to
                    </label>
                    <input
                      id="earn-to"
                      name="to"
                      type="date"
                      defaultValue={to}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-content shadow-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground shadow-sm hover:opacity-95"
                  >
                    Apply
                  </button>
                </form>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <Link
                    href={`/operator/finances?tab=earnings&from=${minusCalendarDays(today, 7)}&to=${today}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-content/80 hover:bg-slate-100"
                  >
                    Last 7 days
                  </Link>
                  <Link
                    href={`/operator/finances?tab=earnings&from=${minusCalendarDays(today, 30)}&to=${today}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-content/80 hover:bg-slate-100"
                  >
                    Last 30 days
                  </Link>
                  <Link
                    href={`/operator/finances?tab=earnings&from=${today.slice(0, 8)}01&to=${today}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-content/80 hover:bg-slate-100"
                  >
                    Month to date
                  </Link>
                </div>


                {earningsRows.length === 0 ? (
                  <p className="mt-6 text-sm text-content/70">
                    No completed trips in this range.
                  </p>
                ) : (
                  <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-content/70">
                        <tr>
                          <th className="px-4 py-3">Completed</th>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Earnings</th>
                          <th className="px-4 py-3">Payout release</th>
                          <th className="px-4 py-3">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {earningsRows.map((r) => (
                          <tr key={r.id} className="bg-white">
                            <td className="whitespace-nowrap px-4 py-3 text-content/90">
                              {formatCompletedAt(r.completed_at)}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-content">
                              {r.reference}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-medium text-content">
                              {formatMoney(earningsAmount(r))}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              <PayoutReleaseCountdown
                                payout_eligible_at={r.payout_eligible_at}
                                payout_released_at={r.payout_released_at}
                              />
                            </td>
                            <td className="px-4 py-3 capitalize text-content/80">
                              {r.payment_status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        ) : null}

        {tab === "payouts" ? (
          <section aria-labelledby="fin-payouts-heading">
            <h2
              id="fin-payouts-heading"
              className="text-lg font-semibold text-primary"
            >
              Payouts
            </h2>
            <p className="mt-1 text-sm text-content/70">
              Transfers from your Stripe Express balance to your bank (most
              recent first).
            </p>
            <div className="mt-5">
              <OperatorPayoutsPanel />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
