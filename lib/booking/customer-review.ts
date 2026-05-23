import { BOOKING_STATUS } from "@/lib/validations/enums";
import type { BookingReviewSummary, CustomerBookingRow } from "@/types";

export function canCustomerReviewBooking(
  booking: Pick<
    CustomerBookingRow,
    "status" | "operator_id" | "review"
  >,
): boolean {
  return (
    booking.status === BOOKING_STATUS.completed &&
    booking.operator_id != null &&
    booking.review == null
  );
}

export type ReviewJoinRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export function mapBookingReviewJoin(
  raw: ReviewJoinRow | ReviewJoinRow[] | null | undefined,
): BookingReviewSummary | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row) return null;
  return {
    id: row.id,
    rating: Number(row.rating),
    comment: row.comment,
    created_at: row.created_at,
  };
}
