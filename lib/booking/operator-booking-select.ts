/** Shared Supabase select fragment for operator + profile on customer bookings. */
export const OPERATOR_FOR_CUSTOMER_BOOKING_SELECT = `
  id,
  business_name,
  vehicle_type,
  business_address,
  business_description,
  rating,
  total_reviews,
  profiles!operators_user_id_fkey ( email, phone, full_name )
`;
