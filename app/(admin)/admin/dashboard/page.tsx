import {
  BadgeCheck,
  Calendar,
  Car,
  PoundSterling,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  PendingOperatorsPanel,
  type PendingOperatorRow,
} from "@/components/admin/PendingOperatorsPanel";
import { StatCard } from "@/components/ui/StatCard";
import { getCommissionPercentage } from "@/lib/booking/platform-settings-server";
import { createClient } from "@/lib/supabase/server";

function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 0, 0, 0, 0);
}

function formatRelativeShort(d: Date): string {
  const now = Date.now();
  const diffMs = now - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return min <= 1 ? "1 minute ago" : `${min} minutes ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "1 hour ago" : `${hr} hours ago`;
  const day = Math.floor(hr / 24);
  return day === 1 ? "1 day ago" : `${day} days ago`;
}

function formatMoneyGBP(n: number): string {
  return `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) {
    if (current <= 0) return null;
    return 100;
  }
  return Math.round(((current - previous) / previous) * 100);
}

type ActivityRow = { id: string; title: string; sub: string };

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const todayStr = todayDateString();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonthStart = addMonths(now, 1);
  const prevMonthStart = addMonths(now, -1);

  const { data: pendingOps } = await supabase
    .from("operators")
    .select("id, business_name, created_at, user_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true });


  const userIds = Array.from(
    new Set((pendingOps ?? []).map((o) => o.user_id)),
  );
  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
      : { data: [] as { id: string; full_name: string | null }[] };

  const nameByUser = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name ?? "Unknown"]),
  );

  const pendingRows: PendingOperatorRow[] = (pendingOps ?? []).map((o) => ({
    id: o.id,
    businessName: o.business_name,
    operatorName: nameByUser[o.user_id] ?? "Unknown",
    joinedAtLabel: new Date(o.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  }));


  const { count: todayBookingsCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("pickup_date", todayStr);

  const { data: todayRevRows } = await supabase
    .from("bookings")
    .select("price")
    .eq("pickup_date", todayStr)
    .in("status", ["completed", "confirmed"]);

  const todayRevenue =
    todayRevRows?.reduce((sum, row) => sum + Number(row.price ?? 0), 0) ?? 0;

  const { count: activeOperatorsCount } = await supabase
    .from("operators")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");

  const { count: totalCustomersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "customer");

  const { count: thisMonthBookingsCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthStart.toISOString())
    .lt("created_at", nextMonthStart.toISOString());

  const { count: lastMonthBookingsCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .gte("created_at", prevMonthStart.toISOString())
    .lt("created_at", monthStart.toISOString());

  const { data: thisMonthRevRows } = await supabase
    .from("bookings")
    .select("price")
    .gte("created_at", monthStart.toISOString())
    .lt("created_at", nextMonthStart.toISOString())
    .in("status", ["completed", "confirmed"]);

  const { data: lastMonthRevRows } = await supabase
    .from("bookings")
    .select("price")
    .gte("created_at", prevMonthStart.toISOString())
    .lt("created_at", monthStart.toISOString())
    .in("status", ["completed", "confirmed"]);

  const thisMonthRevenue =
    thisMonthRevRows?.reduce((s, r) => s + Number(r.price ?? 0), 0) ?? 0;
  const lastMonthRevenue =
    lastMonthRevRows?.reduce((s, r) => s + Number(r.price ?? 0), 0) ?? 0;

  const commissionPercent = await getCommissionPercentage(supabase);
  const commissionRate = commissionPercent / 100;
  const thisMonthCommission = thisMonthRevenue * commissionRate;
  const lastMonthCommission = lastMonthRevenue * commissionRate;

  const bookingsPct = pctChange(
    thisMonthBookingsCount ?? 0,
    lastMonthBookingsCount ?? 0,
  );
  const revenuePct = pctChange(thisMonthRevenue, lastMonthRevenue);
  const commissionPct = pctChange(thisMonthCommission, lastMonthCommission);

  const { data: activityBookings } = await supabase
    .from("bookings")
    .select("id, reference, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: activityOperators } = await supabase
    .from("operators")
    .select("id, business_name, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: activityPaid } = await supabase
    .from("bookings")
    .select("id, reference, price, updated_at")
    .eq("payment_status", "paid")
    .order("updated_at", { ascending: false })
    .limit(8);

  const { data: activityCompleted } = await supabase
    .from("bookings")
    .select("id, reference, updated_at")
    .eq("status", "completed")
    .order("updated_at", { ascending: false })
    .limit(8);

  const { data: activityProfileUpdates } = await supabase
    .from("operators")
    .select("id, business_name, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(12);

  const raw: { id: string; at: Date; title: string }[] = [];

  for (const b of activityBookings ?? []) {
    raw.push({
      id: `b-created-${b.id}`,
      at: new Date(b.created_at),
      title: `New booking #${b.reference} created`,
    });
  }
  for (const o of activityOperators ?? []) {
    raw.push({
      id: `o-reg-${o.id}`,
      at: new Date(o.created_at),
      title: `New operator '${o.business_name}' registered`,
    });
  }
  for (const b of activityPaid ?? []) {
    raw.push({
      id: `b-paid-${b.id}`,
      at: new Date(b.updated_at),
      title: `Payment of ${formatMoneyGBP(Number(b.price ?? 0))} processed`,
    });
  }
  for (const b of activityCompleted ?? []) {
    raw.push({
      id: `b-done-${b.id}`,
      at: new Date(b.updated_at),
      title: `Booking #${b.reference} completed`,
    });
  }
  for (const o of activityProfileUpdates ?? []) {
    const created = new Date(o.created_at).getTime();
    const updated = new Date(o.updated_at).getTime();
    if (updated > created + 60_000) {
      raw.push({
        id: `o-up-${o.id}-${updated}`,
        at: new Date(o.updated_at),
        title: `Operator '${o.business_name}' updated profile`,
      });
    }
  }

  raw.sort((a, b) => b.at.getTime() - a.at.getTime());
  const seenIds = new Set<string>();
  const activityRows: ActivityRow[] = [];
  for (const r of raw) {
    if (seenIds.has(r.id)) continue;
    seenIds.add(r.id);
    activityRows.push({
      id: r.id,
      title: r.title,
      sub: formatRelativeShort(r.at),
    });
    if (activityRows.length >= 5) break;
  }

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Platform overview and key metrics
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Bookings Today"
            value={todayBookingsCount ?? 0}
            icon={Calendar}
            iconPosition="right"
          />
          <StatCard
            title="Total Revenue Today"
            value={formatMoneyGBP(todayRevenue)}
            icon={PoundSterling}
            iconPosition="right"
          />
          <StatCard
            title="Active Operators"
            value={activeOperatorsCount ?? 0}
            icon={Car}
            iconPosition="right"
          />
          <StatCard
            title="Total Customers"
            value={(totalCustomersCount ?? 0).toLocaleString("en-GB")}
            icon={Users}
            iconPosition="right"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/60">
            <h2 className="text-lg font-semibold text-[#111827]">
              Recent Activity
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              {activityRows.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-[#6B7280]">
                  No recent activity to display.
                </div>
              ) : (
                activityRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl bg-slate-50 px-4 py-3.5 ring-1 ring-slate-100"
                  >
                    <p className="text-sm font-medium text-[#111827]">
                      {row.title}
                    </p>
                    <p className="mt-1 text-xs text-[#6B7280]">{row.sub}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/60">
            <h2 className="text-lg font-semibold text-[#111827]">
              Monthly Overview
            </h2>
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4 rounded-xl bg-sky-50 px-5 py-4 ring-1 ring-sky-100/80">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-sky-900/80">
                    Total Bookings
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#111827]">
                    {(thisMonthBookingsCount ?? 0).toLocaleString("en-GB")}
                  </p>
                  {bookingsPct !== null ? (
                    <p className="mt-1 text-xs font-medium text-[#10B981]">
                      {bookingsPct >= 0 ? "+" : ""}
                      {bookingsPct}% from last month
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[#6B7280]">
                      No comparison data yet
                    </p>
                  )}
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <TrendingUp className="h-5 w-5" aria-hidden />
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl bg-emerald-50 px-5 py-4 ring-1 ring-emerald-100/80">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-emerald-900/80">
                    Total Revenue
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#111827]">
                    {formatMoneyGBP(thisMonthRevenue)}
                  </p>
                  {revenuePct !== null ? (
                    <p className="mt-1 text-xs font-medium text-[#10B981]">
                      {revenuePct >= 0 ? "+" : ""}
                      {revenuePct}% from last month
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[#6B7280]">
                      No comparison data yet
                    </p>
                  )}
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <PoundSterling className="h-5 w-5" aria-hidden />
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl bg-violet-50 px-5 py-4 ring-1 ring-violet-100/80">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-violet-900/80">
                    Commission Earned
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[#111827]">
                    {formatMoneyGBP(thisMonthCommission)}
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {commissionPercent}% platform commission
                  </p>
                  {commissionPct !== null && lastMonthCommission > 0 ? (
                    <p className="mt-0.5 text-xs font-medium text-[#10B981]">
                      {commissionPct >= 0 ? "+" : ""}
                      {commissionPct}% from last month
                    </p>
                  ) : null}
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <BadgeCheck className="h-5 w-5" aria-hidden />
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[#111827]">
            Pending operators
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Review and approve operator applications.
          </p>
          <div className="mt-4">
            <PendingOperatorsPanel operators={pendingRows} />
          </div>
        </section>
      </div>
    </div>
  );
}
