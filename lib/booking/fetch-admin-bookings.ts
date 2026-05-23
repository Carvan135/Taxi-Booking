import { createClient } from "@/lib/supabase/server";
import type { AdminBookingsListParams } from "@/lib/booking/admin-bookings-query";
import {
  BOOKING_STATUS,
  COMPLETION_STATUS,
  OPERATOR_STATUS,
  type BookingStatus,
} from "@/lib/validations/enums";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminBookingRow = {
  id: string;
  reference: string;
  status: BookingStatus;
  completion_status: string;
  auto_complete_at: string | null;
  dispute_reason: string | null;
  pickup_address: string;
  dropoff_address: string;
  pickup_date: string;
  pickup_time: string;
  price: number | null;
  platform_commission: number;
  operator_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string;
  created_at: string;
  completed_at: string | null;
  assigned_at: string | null;
  payout_eligible_at: string | null;
  payout_released_at: string | null;
  operators: {
    id: string;
    business_name: string;
    vehicle_type: string;
  } | null;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
};

export type AdminBookingsSummary = {
  totalBookings: number;
  totalRevenue: number;
  totalCommission: number;
  completionRate: number;
  disputedCount: number;
};

export type AdminBookingsPageResult = {
  rows: AdminBookingRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const BOOKING_SELECT = `
  id,
  reference,
  status,
  completion_status,
  auto_complete_at,
  dispute_reason,
  pickup_address,
  dropoff_address,
  pickup_date,
  pickup_time,
  price,
  platform_commission,
  operator_id,
  customer_id,
  customer_name,
  customer_email,
  created_at,
  completed_at,
  assigned_at,
  payout_eligible_at,
  payout_released_at,
  operators!bookings_operator_id_fkey ( id, business_name, vehicle_type ),
  profiles!bookings_customer_id_fkey ( full_name, email )
`;

const SUMMARY_SELECT =
  "id, status, completion_status, price, platform_commission";

async function resolveOperatorIdsForSearch(
  supabase: SupabaseClient,
  term: string,
): Promise<string[]> {
  const pattern = `%${term}%`;
  const { data } = await supabase
    .from("operators")
    .select("id")
    .ilike("business_name", pattern);
  return (data ?? []).map((row) => row.id as string);
}

async function resolveCustomerIdsForSearch(
  supabase: SupabaseClient,
  term: string,
): Promise<string[]> {
  const pattern = `%${term}%`;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
  return (data ?? []).map((row) => row.id as string);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyAdminBookingFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  params: AdminBookingsListParams,
  options?: { operatorIdsForSearch?: string[]; customerIdsForSearch?: string[] },
) {
  let q = query;

  if (params.status === "disputed") {
    q = q.eq("completion_status", COMPLETION_STATUS.disputed);
  } else if (params.status !== "all") {
    q = q.eq("status", params.status);
  }

  if (params.operatorId === "unassigned") {
    q = q.is("operator_id", null);
  } else if (params.operatorId !== "all") {
    q = q.eq("operator_id", params.operatorId);
  }

  if (params.dateFrom) {
    q = q.gte("pickup_date", params.dateFrom);
  }
  if (params.dateTo) {
    q = q.lte("pickup_date", params.dateTo);
  }

  if (params.search) {
    const pattern = `%${params.search}%`;
    const orParts = [
      `reference.ilike.${pattern}`,
      `customer_name.ilike.${pattern}`,
      `customer_email.ilike.${pattern}`,
      `pickup_address.ilike.${pattern}`,
      `dropoff_address.ilike.${pattern}`,
    ];

    const operatorIds = options?.operatorIdsForSearch ?? [];
    if (operatorIds.length > 0) {
      orParts.push(`operator_id.in.(${operatorIds.join(",")})`);
    }

    const customerIds = options?.customerIdsForSearch ?? [];
    if (customerIds.length > 0) {
      orParts.push(`customer_id.in.(${customerIds.join(",")})`);
    }

    q = q.or(orParts.join(","));
  }

  return q;
}

export async function fetchAdminBookingsPage(
  params: AdminBookingsListParams,
): Promise<AdminBookingsPageResult> {
  const supabase = createClient();

  let operatorIdsForSearch: string[] | undefined;
  let customerIdsForSearch: string[] | undefined;
  if (params.search) {
    [operatorIdsForSearch, customerIdsForSearch] = await Promise.all([
      resolveOperatorIdsForSearch(supabase, params.search),
      resolveCustomerIdsForSearch(supabase, params.search),
    ]);
  }

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT, { count: "exact" });

  query = applyAdminBookingFilters(query, params, {
    operatorIdsForSearch,
    customerIdsForSearch,
  });

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / params.pageSize));
  const page = Math.min(params.page, totalPages);

  return {
    rows: (data ?? []) as unknown as AdminBookingRow[],
    totalCount,
    page,
    pageSize: params.pageSize,
    totalPages,
  };
}

export async function fetchAdminBookingsSummary(
  params: AdminBookingsListParams,
): Promise<AdminBookingsSummary> {
  const supabase = createClient();

  let operatorIdsForSearch: string[] | undefined;
  let customerIdsForSearch: string[] | undefined;
  if (params.search) {
    [operatorIdsForSearch, customerIdsForSearch] = await Promise.all([
      resolveOperatorIdsForSearch(supabase, params.search),
      resolveCustomerIdsForSearch(supabase, params.search),
    ]);
  }

  let query = supabase.from("bookings").select(SUMMARY_SELECT);

  query = applyAdminBookingFilters(query, params, {
    operatorIdsForSearch,
    customerIdsForSearch,
  });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const totalBookings = rows.length;
  let totalRevenue = 0;
  let totalCommission = 0;
  let completedCount = 0;
  let disputedCount = 0;

  for (const row of rows) {
    const price = row.price != null ? Number(row.price) : 0;
    totalRevenue += price;
    totalCommission += Number(row.platform_commission ?? 0);
    if (row.status === BOOKING_STATUS.completed) {
      completedCount += 1;
    }
    if (row.completion_status === COMPLETION_STATUS.disputed) {
      disputedCount += 1;
    }
  }

  const completionRate =
    totalBookings > 0
      ? Math.round((completedCount / totalBookings) * 100)
      : 0;

  return {
    totalBookings,
    totalRevenue,
    totalCommission,
    completionRate,
    disputedCount,
  };
}

export type ApprovedOperatorOption = {
  id: string;
  business_name: string;
};

export type OperatorFilterOption = {
  id: string;
  business_name: string;
};

export async function fetchApprovedOperators(): Promise<ApprovedOperatorOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("operators")
    .select("id, business_name")
    .eq("status", OPERATOR_STATUS.approved)
    .order("business_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ApprovedOperatorOption[];
}

/** All operators for the admin bookings filter dropdown. */
export async function fetchOperatorsForBookingFilter(): Promise<
  OperatorFilterOption[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("operators")
    .select("id, business_name")
    .order("business_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as OperatorFilterOption[];
}
