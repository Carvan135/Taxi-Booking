-- Allow guests (anon) to browse approved operators during the public booking flow.

CREATE POLICY "operators_select_approved_anon"
  ON public.operators
  FOR SELECT
  TO anon
  USING (status = 'approved'::public.operator_status_enum);
