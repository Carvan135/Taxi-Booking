-- Guest customers (no account) can leave reviews verified by booking customer_email.

ALTER TABLE public.booking_reviews
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.booking_reviews
  ADD COLUMN IF NOT EXISTS customer_email TEXT;

ALTER TABLE public.booking_reviews
  DROP CONSTRAINT IF EXISTS booking_reviews_customer_identity_chk;

ALTER TABLE public.booking_reviews
  ADD CONSTRAINT booking_reviews_customer_identity_chk
  CHECK (
    customer_id IS NOT NULL
    OR (customer_email IS NOT NULL AND trim(customer_email) <> '')
  );

CREATE INDEX IF NOT EXISTS idx_booking_reviews_customer_email
  ON public.booking_reviews (lower(trim(customer_email)))
  WHERE customer_email IS NOT NULL;

-- Link guest reviews when a customer profile is created (matches guest bookings flow).
CREATE OR REPLACE FUNCTION public.link_guest_bookings_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'customer'::public.user_role_enum
     AND NEW.email IS NOT NULL
     AND trim(NEW.email) <> '' THEN
    UPDATE public.bookings
    SET
      customer_id = NEW.id,
      updated_at = now()
    WHERE customer_id IS NULL
      AND lower(trim(customer_email)) = lower(trim(NEW.email));

    UPDATE public.booking_reviews
    SET
      customer_id = NEW.id,
      customer_email = NULL,
      updated_at = now()
    WHERE customer_id IS NULL
      AND customer_email IS NOT NULL
      AND lower(trim(customer_email)) = lower(trim(NEW.email));
  END IF;

  RETURN NEW;
END;
$$;
