-- Guest cancel unpaid pending bookings; expire abandoned drafts.

CREATE OR REPLACE FUNCTION public.cancel_unpaid_booking(
  p_booking_id uuid,
  p_customer_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_reference text;
  v_customer_id uuid;
  v_email text;
BEGIN
  SELECT group_reference, customer_id, lower(trim(customer_email))
  INTO v_group_reference, v_customer_id, v_email
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_customer_id IS NOT NULL THEN
    IF v_customer_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF p_customer_email IS NULL OR lower(trim(p_customer_email)) <> v_email THEN
      RAISE EXCEPTION 'Email does not match booking' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_group_reference IS NOT NULL THEN
    UPDATE public.bookings
    SET
      status = 'cancelled'::public.booking_status_enum,
      updated_at = now()
    WHERE group_reference = v_group_reference
      AND status = 'pending'::public.booking_status_enum
      AND payment_status IN ('unpaid'::public.payment_status_enum, 'failed'::public.payment_status_enum)
      AND journey_started_at IS NULL;
  ELSE
    UPDATE public.bookings
    SET
      status = 'cancelled'::public.booking_status_enum,
      updated_at = now()
    WHERE id = p_booking_id
      AND status = 'pending'::public.booking_status_enum
      AND payment_status IN ('unpaid'::public.payment_status_enum, 'failed'::public.payment_status_enum)
      AND journey_started_at IS NULL;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking cannot be cancelled' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_unpaid_booking(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_unpaid_booking(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.expire_stale_pending_bookings(
  p_max_age interval DEFAULT interval '7 days'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.bookings
  SET
    status = 'cancelled'::public.booking_status_enum,
    updated_at = now()
  WHERE status = 'pending'::public.booking_status_enum
    AND payment_status = 'unpaid'::public.payment_status_enum
    AND created_at < now() - p_max_age
    AND journey_started_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_pending_bookings(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_pending_bookings(interval) TO service_role;
