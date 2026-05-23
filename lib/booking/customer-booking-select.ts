import { OPERATOR_FOR_CUSTOMER_BOOKING_SELECT } from "@/lib/booking/operator-booking-select";

/** Supabase select fragment for logged-in customer booking lists. */
export const CUSTOMER_BOOKING_LIST_SELECT = `
  *,
  operators!bookings_operator_id_fkey (
    ${OPERATOR_FOR_CUSTOMER_BOOKING_SELECT}
  ),
  booking_reviews (
    id,
    rating,
    comment,
    created_at
  )
`;
