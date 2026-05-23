import { createClient } from "@/lib/supabase/server";
import type { AdminOperatorsListParams } from "@/lib/admin/admin-operators-query";
import type { OperatorCardModel } from "@/components/admin/OperatorsManagement";
import type { SupabaseClient } from "@supabase/supabase-js";

type OperatorRow = {
  id: string;
  business_name: string;
  status: string;
  rating: number;
  total_reviews: number;
  created_at: string;
  stripe_onboarding_complete: boolean;
  fleet_vehicle_count: number | null;
  user_id: string;
  profiles: {
    email: string;
    phone: string | null;
    full_name: string | null;
  } | null;
};

export type AdminOperatorsPageResult = {
  rows: OperatorCardModel[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const OPERATOR_SELECT = `
  id,
  business_name,
  status,
  rating,
  total_reviews,
  created_at,
  stripe_onboarding_complete,
  fleet_vehicle_count,
  user_id,
  profiles!operators_user_id_fkey ( email, phone, full_name )
`;

function asOperatorStatus(s: string): OperatorCardModel["status"] {
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

async function resolveUserIdsForOperatorSearch(
  supabase: SupabaseClient,
  term: string,
): Promise<string[]> {
  const pattern = `%${term}%`;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`);
  return (data ?? []).map((row) => row.id as string);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyOperatorFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  params: AdminOperatorsListParams,
  options?: { userIdsForSearch?: string[] },
) {
  let q = query;

  if (params.status !== "all") {
    q = q.eq("status", params.status);
  }

  if (params.search) {
    const pattern = `%${params.search}%`;
    const orParts = [`business_name.ilike.${pattern}`];
    const userIds = options?.userIdsForSearch ?? [];
    if (userIds.length > 0) {
      orParts.push(`user_id.in.(${userIds.join(",")})`);
    }
    q = q.or(orParts.join(","));
  }

  return q;
}

async function fetchOperatorBookingStats(
  supabase: SupabaseClient,
  operatorIds: string[],
): Promise<Map<string, { count: number; revenue: number }>> {
  const stats = new Map<string, { count: number; revenue: number }>();
  if (operatorIds.length === 0) return stats;

  const { data, error } = await supabase
    .from("bookings")
    .select("operator_id, price")
    .in("operator_id", operatorIds)
    .in("status", ["completed", "confirmed"]);

  if (error) throw error;

  for (const b of data ?? []) {
    const oid = b.operator_id as string;
    const cur = stats.get(oid) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(b.price ?? 0);
    stats.set(oid, cur);
  }

  return stats;
}

function mapOperatorRow(
  o: OperatorRow,
  stats: Map<string, { count: number; revenue: number }>,
): OperatorCardModel {
  const p = o.profiles;
  const st = stats.get(o.id) ?? { count: 0, revenue: 0 };
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
}

export async function fetchAdminOperatorsPage(
  params: AdminOperatorsListParams,
): Promise<AdminOperatorsPageResult> {
  const supabase = createClient();

  let userIdsForSearch: string[] | undefined;
  if (params.search) {
    userIdsForSearch = await resolveUserIdsForOperatorSearch(
      supabase,
      params.search,
    );
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from("operators")
    .select(OPERATOR_SELECT, { count: "exact" });

  query = applyOperatorFilters(query, params, { userIdsForSearch });

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const rawRows = (data ?? []) as unknown as OperatorRow[];
  const operatorIds = rawRows.map((o) => o.id);
  const stats = await fetchOperatorBookingStats(supabase, operatorIds);
  const rows = rawRows.map((o) => mapOperatorRow(o, stats));

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / params.pageSize));
  const page = Math.min(params.page, totalPages);

  return {
    rows,
    totalCount,
    page,
    pageSize: params.pageSize,
    totalPages,
  };
}
