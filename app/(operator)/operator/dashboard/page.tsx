import Link from "next/link";
import {
  CalendarRange,
  PoundSterling,
  Star,
  ArrowRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/server";
import type { OperatorStatus } from "@/types";

export default async function OperatorDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const { data: operator } = await supabase
    .from("operators")
    .select("id, business_name, status")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const welcomeName =
    operator?.business_name ?? profile?.full_name ?? "Operator";

  const status = (operator?.status ?? "pending") as OperatorStatus;

  const recent =
    operator?.id != null
      ? await supabase
          .from("bookings")
          .select("id, reference, pickup_date, status")
          .eq("operator_id", operator.id)
          .order("created_at", { ascending: false })
          .limit(5)
      : { data: [] as { id: string; reference: string; pickup_date: string; status: string }[] };

  const recentRows = recent.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Welcome back, {welcomeName}
          </h1>
          <p className="mt-1 text-sm text-content/70">
            Here’s a snapshot of your operator account.
          </p>
        </div>
      </div>

      {/* Status banner */}
      <div className="mt-6">
        {!operator ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-content/80">
            Complete your{" "}
            <Link
              href="/operator/onboarding"
              className="font-semibold text-secondary underline-offset-2 hover:underline"
            >
              onboarding
            </Link>{" "}
            to submit your profile for review.
          </div>
        ) : status === "pending" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong className="font-semibold">Under review.</strong> Your account
            is under review. We&apos;ll notify you within 24–48 hours.
          </div>
        ) : status === "approved" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <strong className="font-semibold">Active.</strong> Your account is
            active.
          </div>
        ) : status === "rejected" || status === "suspended" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Your operator status is <strong>{status}</strong>. Contact support if
            you need help.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-content/80">
            Account status: <strong className="capitalize">{status}</strong>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total bookings"
          value={0}
          icon={CalendarRange}
          trend="+0 this week"
        />
        <StatCard
          title="This month’s earnings (£)"
          value="£0.00"
          icon={PoundSterling}
        />
        <StatCard title="Average rating" value="0.0" icon={Star} />
      </div>

      {/* Recent bookings */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-primary">Recent bookings</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {recentRows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-content/70">
              No bookings yet
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-content/70">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Pickup date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRows.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-medium">{b.reference}</td>
                    <td className="px-4 py-3 text-content/80">{b.pickup_date}</td>
                    <td className="px-4 py-3 capitalize text-content/80">
                      {b.status.replace(/_/g, " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Quick links */}
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/operator/bookings"
          className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground shadow-sm transition hover:opacity-95"
        >
          View bookings
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/operator/profile"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-primary px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5"
        >
          Edit profile
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
