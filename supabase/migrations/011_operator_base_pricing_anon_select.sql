-- Guests can read base pricing for approved operators during the public booking flow.

CREATE POLICY "operator_base_pricing_select_approved_anon"
  ON public.operator_base_pricing
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.operators o
      WHERE o.id = operator_base_pricing.operator_id
        AND o.status = 'approved'::public.operator_status_enum
    )
  );
