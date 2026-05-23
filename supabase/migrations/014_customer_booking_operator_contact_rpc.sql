-- Customers can read operator rows assigned to their bookings (not only approved browse list).
CREATE POLICY "operators_select_on_customer_booking"
  ON public.operators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.operator_id = operators.id
        AND b.customer_id = auth.uid()
    )
  );

-- Reliable operator contact for customer booking cards (bypasses nested profile RLS).
CREATE OR REPLACE FUNCTION public.customer_booking_operator_contacts(
  p_booking_ids uuid[]
)
RETURNS TABLE (
  booking_id uuid,
  operator_id uuid,
  business_name text,
  vehicle_type text,
  email text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    o.id,
    o.business_name,
    o.vehicle_type::text,
    p.email,
    p.phone
  FROM public.bookings b
  INNER JOIN public.operators o ON o.id = b.operator_id
  INNER JOIN public.profiles p ON p.id = o.user_id
  WHERE b.id = ANY (p_booking_ids)
    AND b.customer_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.customer_booking_operator_contacts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_booking_operator_contacts(uuid[]) TO authenticated;
