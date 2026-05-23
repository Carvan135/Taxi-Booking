-- Customers cannot cancel once the operator has started the journey.

CREATE OR REPLACE FUNCTION public.customer_cancel_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET
    status = 'cancelled'::public.booking_status_enum,
    updated_at = now()
  WHERE id = p_booking_id
    AND customer_id = auth.uid()
    AND journey_started_at IS NULL
    AND status NOT IN (
      'completed'::public.booking_status_enum,
      'cancelled'::public.booking_status_enum
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or cannot be cancelled'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;
