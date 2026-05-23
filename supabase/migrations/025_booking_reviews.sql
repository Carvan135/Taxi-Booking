-- Customer reviews after completed bookings; keeps operators.rating in sync

CREATE TABLE IF NOT EXISTS public.booking_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings (id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.operators (id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_reviews_operator_id
  ON public.booking_reviews (operator_id);

CREATE INDEX IF NOT EXISTS idx_booking_reviews_customer_id
  ON public.booking_reviews (customer_id);

CREATE TRIGGER booking_reviews_set_updated_at
  BEFORE UPDATE ON public.booking_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_operator_review_stats(p_operator_id UUID)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.operators o
  SET
    total_reviews = COALESCE(s.cnt, 0),
    rating = COALESCE(s.avg_rating, 0)
  FROM (
    SELECT
      COUNT(*)::int AS cnt,
      ROUND(AVG(r.rating)::numeric, 2) AS avg_rating
    FROM public.booking_reviews r
    WHERE r.operator_id = p_operator_id
  ) s
  WHERE o.id = p_operator_id;
$$;

CREATE OR REPLACE FUNCTION public.booking_reviews_sync_operator_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_operator_review_stats(OLD.operator_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.operator_id IS DISTINCT FROM NEW.operator_id THEN
    PERFORM public.refresh_operator_review_stats(OLD.operator_id);
  END IF;

  PERFORM public.refresh_operator_review_stats(NEW.operator_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_reviews_sync_operator_stats ON public.booking_reviews;

CREATE TRIGGER booking_reviews_sync_operator_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.booking_reviews_sync_operator_stats();

ALTER TABLE public.booking_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_reviews_select_customer"
  ON public.booking_reviews
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "booking_reviews_select_operator"
  ON public.booking_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.operators o
      WHERE o.id = booking_reviews.operator_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "booking_reviews_insert_customer_completed"
  ON public.booking_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
        AND b.status = 'completed'
        AND b.operator_id IS NOT NULL
        AND b.operator_id = booking_reviews.operator_id
    )
  );

CREATE POLICY "booking_reviews_admin_all"
  ON public.booking_reviews
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE POLICY "booking_reviews_service_role_all"
  ON public.booking_reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
