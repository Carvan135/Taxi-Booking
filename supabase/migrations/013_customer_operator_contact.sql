-- Customers may read operator profile contact details for operators on their bookings.
CREATE POLICY "profiles_select_operator_for_customer_booking"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      INNER JOIN public.operators o ON o.id = b.operator_id
      WHERE b.customer_id = auth.uid()
        AND o.user_id = profiles.id
    )
  );
