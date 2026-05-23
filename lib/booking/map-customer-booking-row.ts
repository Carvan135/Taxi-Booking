import { mapBookingReviewJoin } from "@/lib/booking/customer-review";
import type { CustomerBookingRow } from "@/types";
import type { VehicleType } from "@/types";

type ProfileJoin = {
  email: string;
  phone: string | null;
  full_name: string | null;
};

type OperatorJoin = {
  id: string;
  business_name: string;
  vehicle_type: VehicleType;
  business_address?: string | null;
  business_description?: string | null;
  rating?: number | null;
  total_reviews?: number | null;
  profiles?: ProfileJoin | ProfileJoin[] | null;
};

function profileFromJoin(
  profiles: OperatorJoin["profiles"],
): ProfileJoin | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

export function mapOperatorJoin(
  raw: OperatorJoin | OperatorJoin[] | null,
): CustomerBookingRow["operators"] {
  const op = Array.isArray(raw) ? raw[0] : raw;
  if (!op) return null;
  const profile = profileFromJoin(op.profiles);
  return {
    id: op.id,
    business_name: op.business_name,
    vehicle_type: op.vehicle_type,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    contact_name: profile?.full_name?.trim() || null,
    business_address: op.business_address?.trim() || null,
    business_description: op.business_description?.trim() || null,
    rating: Number(op.rating ?? 0),
    total_reviews: Number(op.total_reviews ?? 0),
  };
}

type ReviewJoin = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type BookingRowWithOperator = Omit<
  CustomerBookingRow,
  "operators" | "review"
> & {
  operators: OperatorJoin | OperatorJoin[] | null;
  booking_reviews?: ReviewJoin | ReviewJoin[] | null;
};

export function mapCustomerBookingRow(
  row: BookingRowWithOperator,
): CustomerBookingRow {
  const operators = mapOperatorJoin(row.operators);
  const review = mapBookingReviewJoin(row.booking_reviews);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip join aliases from spread
  const { operators: _join, booking_reviews: _reviews, ...booking } = row;
  return { ...booking, operators, review };
}
