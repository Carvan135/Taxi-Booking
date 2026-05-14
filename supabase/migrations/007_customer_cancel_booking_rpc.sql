-- Allow customers to cancel their own active bookings via a locked-down RPC
-- (Direct UPDATE is not granted to customers in 001_initial_schema.)

CREATE OR REPLACE FUNCTION public.customer_cancel_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_booking_id
    AND customer_id = auth.uid()
    AND status NOT IN ('completed', 'cancelled');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or cannot be cancelled'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.customer_cancel_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_cancel_booking(uuid) TO authenticated;
