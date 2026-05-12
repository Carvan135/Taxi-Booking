import {
  OperatorsManagement,
  type OperatorCardModel,
} from "@/components/admin/OperatorsManagement";
import { createClient } from "@/lib/supabase/server";

function asOperatorStatus(
  s: string,
): OperatorCardModel["status"] {
  if (
    s === "approved" ||
    s === "pending" ||
    s === "rejected" ||
    s === "suspended"
  ) {
    return s;
  }
  return "pending";
}

export default async function AdminOperatorsPage() {
  const supabase = createClient();

  const { data: operators, error: opErr } = await supabase
    .from("operators")
    .select(
      "id, business_name, status, rating, total_reviews, created_at, stripe_onboarding_complete, fleet_vehicle_count, user_id",
    )
    .order("created_at", { ascending: false });

  if (opErr) {
    return (
      <div className="min-h-full bg-[#F9FAFB] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load operators: {opErr.message}
        </div>
      </div>
    );
  }

  const list = operators ?? [];
  const userIds = Array.from(new Set(list.map((o) => o.user_id)));

  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, email, phone, full_name")
          .in("id", userIds)
      : {
          data: [] as {
            id: string;
            email: string;
            phone: string | null;
            full_name: string | null;
          }[],
        };

  const profileByUserId = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  const { data: revBookings } = await supabase
    .from("bookings")
    .select("operator_id, price")
    .in("status", ["completed", "confirmed"])
    .not("operator_id", "is", null);

  const statsByOperator = new Map<
    string,
    { count: number; revenue: number }
  >();
  for (const b of revBookings ?? []) {
    const oid = b.operator_id as string;
    const cur = statsByOperator.get(oid) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(b.price ?? 0);
    statsByOperator.set(oid, cur);
  }

  const rows: OperatorCardModel[] = list.map((o) => {
    const p = profileByUserId[o.user_id];
    const st = statsByOperator.get(o.id) ?? { count: 0, revenue: 0 };
    return {
      id: o.id,
      businessName: o.business_name,
      status: asOperatorStatus(o.status),
      email: p?.email ?? "—",
      phone: p?.phone ?? null,
      contactName: p?.full_name ?? null,
      fleetVehicleCount: o.fleet_vehicle_count ?? 1,
      joinedIso: o.created_at,
      rating: Number(o.rating ?? 0),
      totalReviews: o.total_reviews ?? 0,
      verified: Boolean(o.stripe_onboarding_complete),
      bookingsCount: st.count,
      revenueGbp: st.revenue,
    };
  });

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
            Operators Management
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage and monitor all platform operators
          </p>
        </div>

        <div className="mt-8">
          <OperatorsManagement rows={rows} />
        </div>
      </div>
    </div>
  );
}
