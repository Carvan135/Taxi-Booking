import {
  AlertTriangle,
  ClipboardList,
  PoundSterling,
  Users,
} from "lucide-react";
import {
  PendingOperatorsPanel,
  type PendingOperatorRow,
} from "@/components/admin/PendingOperatorsPanel";
import { StatCard } from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = createClient();

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Admin dashboard</h1>
        <p className="mt-1 text-sm text-content/70">
          Overview and approvals — Milestone 1 preview.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total bookings" value={0} icon={ClipboardList} />
        <StatCard title="Total operators" value={0} icon={Users} />
        <StatCard title="Total revenue (£)" value="£0.00" icon={PoundSterling} />
        <StatCard title="Pending approvals" value={0} icon={AlertTriangle} />
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-primary">
          Pending operators
        </h2>
        <p className="mt-1 text-sm text-content/70">
          Review and approve operator applications.
        </p>
        <div className="mt-4">
          <PendingOperatorsPanel operators={pendingRows} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-primary">Recent bookings</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-content/70">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-content/60"
                >
                  No recent bookings to display.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
