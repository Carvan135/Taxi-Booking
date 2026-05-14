import {
  Calendar,
  Clock,
  PoundSterling,
  Users,
} from "lucide-react";
import Link from "next/link";
import { ClearStripeReturnQuery } from "@/components/operator/ClearStripeReturnQuery";
import { ConnectStripeButton } from "@/components/operator/ConnectStripeButton";
import { OperatorDashboardStatusBanner } from "@/components/operator/OperatorDashboardStatusBanner";
import { StatCard } from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/server";
import type { OperatorStatus } from "@/types";

function londonTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mondayUtcOfWeekContaining(d: Date): Date {
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + mondayOffset),
  );
}

const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type BookingListRow = {
  id: string;
  reference: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_date: string;
  pickup_time: string;
  status: string;
  profiles: { full_name: string | null } | null;
};

function formatTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  return m ? `${m[1]}:${m[2]}` : t.slice(0, 5);
}

function formatMoney(n: number): string {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatConnectedDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeZone: "Europe/London",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function operatorDashboardBannerId(
  status: OperatorStatus,
  stripeOnboardingComplete: boolean,
  stripePayoutsEnabled: boolean,
): string {
  if (status === "pending") return "op-pending";
  if (status === "rejected") return "op-rejected";
  if (status === "suspended") return "op-suspended";
  if (status === "approved") {
    if (!stripeOnboardingComplete) return "op-approved-stripe-setup";
    if (!stripePayoutsEnabled) return "op-approved-stripe-review";
    return "op-approved-payouts";
  }
  return `op-other-${status}`;
}

function stripeReturnSuccess(
  searchParams?: Record<string, string | string[] | undefined>,
): boolean {
  const v = searchParams?.stripe;
  if (v === "success") return true;
  if (Array.isArray(v)) return v.includes("success");
  return false;
}

export default async function OperatorDashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: operator } = await supabase
    .from("operators")
    .select(
      "id, business_name, status, stripe_onboarding_complete, stripe_payouts_enabled, stripe_connected_at",
    )
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const fromStripeReturn = stripeReturnSuccess(searchParams);

  const rawOp = operator as Record<string, unknown> | null;
  const status = (operator?.status ?? "pending") as OperatorStatus;
  const stripeOnboardingComplete =
    rawOp?.stripe_onboarding_complete === true;
  const stripePayoutsEnabled = rawOp?.stripe_payouts_enabled === true;
  const stripeConnectedAt =
    rawOp?.stripe_connected_at == null
      ? null
      : String(rawOp.stripe_connected_at);

  const statusBannerId = !operator
    ? "no-operator"
    : operatorDashboardBannerId(
        status,
        stripeOnboardingComplete,
        stripePayoutsEnabled,
      );
  const todayStr = londonTodayYmd();
  const operatorId = operator?.id ?? null;

  let todayBookings = 0;
  let todayRevenue = 0;
  let pendingBookings = 0;
  let totalCustomers = 0;
  let recentRows: BookingListRow[] = [];
  const weeklyDayTotals: { label: string; amount: number; ymd: string }[] = [];

  if (operatorId) {
    const { count: todayCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", operatorId)
      .eq("pickup_date", todayStr);

    todayBookings = todayCount ?? 0;

    const { data: todayPaid } = await supabase
      .from("bookings")
      .select("price")
      .eq("operator_id", operatorId)
      .eq("pickup_date", todayStr)
      .eq("payment_status", "paid");

    todayRevenue = (todayPaid ?? []).reduce(
      (sum, row) => sum + Number(row.price ?? 0),
      0,
    );

    const { count: pendingCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", operatorId)
      .eq("status", "pending");

    pendingBookings = pendingCount ?? 0;

    const { data: customerIds } = await supabase
      .from("bookings")
      .select("customer_id")
      .eq("operator_id", operatorId);

    totalCustomers = new Set(
      (customerIds ?? []).map((r) => r.customer_id),
    ).size;

    const { data: recent } = await supabase
      .from("bookings")
      .select(
        `
        id,
        reference,
        pickup_address,
        dropoff_address,
        pickup_date,
        pickup_time,
        status,
        profiles!bookings_customer_id_fkey ( full_name )
      `,
      )
      .eq("operator_id", operatorId)
      .order("created_at", { ascending: false })
      .limit(5);

    recentRows = (recent ?? []) as unknown as BookingListRow[];

    const monday = mondayUtcOfWeekContaining(new Date());
    const weekStart = utcYmd(monday);
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    const weekEnd = utcYmd(sunday);

    const { data: weekRows } = await supabase
      .from("bookings")
      .select("pickup_date, price")
      .eq("operator_id", operatorId)
      .gte("pickup_date", weekStart)
      .lte("pickup_date", weekEnd)
      .eq("status", "completed");

    const byYmd = new Map<string, number>();
    for (const row of weekRows ?? []) {
      const key = row.pickup_date;
      const prev = byYmd.get(key) ?? 0;
      byYmd.set(key, prev + Number(row.price ?? 0));
    }

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const ymd = utcYmd(d);
      weeklyDayTotals.push({
        label: WEEKDAY_LABELS[i],
        ymd,
        amount: byYmd.get(ymd) ?? 0,
      });
    }
  }

  const weekTotal = weeklyDayTotals.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-content/70">
          Welcome back! Here&apos;s your overview for today.{" "}
          <Link
            href="/operator/finances"
            className="font-medium text-secondary underline-offset-2 hover:underline"
          >
            Finances
          </Link>{" "}
          has payout onboarding, earnings, and payout history.
        </p>
      </div>

      {fromStripeReturn ? <ClearStripeReturnQuery /> : null}

      {/* Informational status — navigation stays available regardless of approval */}
      <OperatorDashboardStatusBanner
        bannerId={statusBannerId}
        className="mt-4"
      >
        {!operator ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-content/80">
            Complete your{" "}
            <Link
              href="/operator/profile"
              className="font-semibold text-secondary underline-offset-2 hover:underline"
            >
              profile
            </Link>{" "}
            to submit your details for review.
          </div>
        ) : status === "pending" ? (
          <div className="rounded-xl border border-slate-200 bg-slate-100/90 px-4 py-3 text-sm text-slate-800">
            <strong className="font-semibold">Under review.</strong> Your account
            is under review. We&apos;ll notify you within 24–48 hours.
          </div>
        ) : status === "rejected" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <strong className="font-semibold">Application not approved.</strong>{" "}
            Please contact support if you have questions.
          </div>
        ) : status === "suspended" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Your operator account is <strong>suspended</strong>. Contact support
            if you need help.
          </div>
        ) : status === "approved" && !stripeOnboardingComplete ? (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              {fromStripeReturn ? (
                <p className="font-semibold text-amber-950">
                  Bank details received from Stripe.
                </p>
              ) : null}
              <p
                className={
                  fromStripeReturn
                    ? "mt-1 font-semibold text-amber-950"
                    : "font-semibold"
                }
              >
                Set up your payouts to start earning
              </p>
              <p className="mt-1 text-amber-900/90">
                Connect your bank account through Stripe so we can pay you for
                completed trips.
              </p>
            </div>
            <ConnectStripeButton tone="amber-banner" />
          </div>
        ) : status === "approved" &&
          stripeOnboardingComplete &&
          !stripePayoutsEnabled ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {fromStripeReturn ? (
              <>
                <strong className="font-semibold">Bank details received.</strong>{" "}
                Stripe is verifying your information. Payouts unlock once that
                finishes — usually 1–2 business days.
              </>
            ) : (
              <>
                <strong className="font-semibold">Verification in progress.</strong>{" "}
                Your payout setup is being reviewed by Stripe. This usually takes
                1–2 business days.
              </>
            )}
          </div>
        ) : status === "approved" &&
          stripeOnboardingComplete &&
          stripePayoutsEnabled ? (
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="font-semibold" aria-hidden>
                ✓{" "}
              </span>
              <strong className="font-semibold">Payouts enabled.</strong>{" "}
              {stripeConnectedAt ? (
                <>
                  Connected on {formatConnectedDate(stripeConnectedAt)}.
                </>
              ) : (
                "Your bank account is connected."
              )}
            </p>
            <p className="text-emerald-900/85 sm:text-right">
              You&apos;re active for bookings.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-content/80">
            Account status: <strong className="capitalize">{status}</strong>
          </div>
        )}
      </OperatorDashboardStatusBanner>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today's bookings"
          value={todayBookings}
          icon={Calendar}
          iconPosition="right"
        />
        <StatCard
          title="Today's revenue"
          value={formatMoney(todayRevenue)}
          icon={PoundSterling}
          iconPosition="right"
        />
        <StatCard
          title="Pending bookings"
          value={pendingBookings}
          icon={Clock}
          iconPosition="right"
        />
        <StatCard
          title="Total customers"
          value={totalCustomers}
          icon={Users}
          iconPosition="right"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-primary">Recent bookings</h2>
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {recentRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-content/60">
                No bookings yet
              </p>
            ) : (
              recentRows.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col gap-3 rounded-lg bg-slate-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1 text-sm">
                    <p className="font-semibold text-primary">
                      #{b.reference.replace(/^#/, "")}
                    </p>
                    <p className="font-medium text-content">
                      {b.profiles?.full_name ?? "Customer"}
                    </p>
                    <p className="text-content/75">
                      {b.pickup_address} → {b.dropoff_address}
                    </p>
                    <p className="text-content/60">
                      Time: {formatTime(b.pickup_time)}
                    </p>
                  </div>
                  <span className="shrink-0 self-start rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-content/90 ring-1 ring-slate-200">
                    {b.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-primary">Weekly revenue</h2>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <ul className="space-y-3 text-sm">
              {weeklyDayTotals.map(({ label, amount }) => (
                <li
                  key={label}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-content/80">{label}</span>
                  <span className="font-medium tabular-nums text-primary">
                    {formatMoney(amount)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-semibold">
              <span className="text-primary">Total this week</span>
              <span className="tabular-nums text-primary">
                {formatMoney(weekTotal)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
