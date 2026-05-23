-- Schedule daily cleanup of abandoned unpaid pending bookings (pg_cron).
-- Requires migration 028_payment_edge_cases.sql (expire_stale_pending_bookings).
-- Enable extension pg_cron in Dashboard → Database → Extensions if needed.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'carvan-expire-pending') THEN
    PERFORM cron.unschedule('carvan-expire-pending');
  END IF;
END;
$cron$;

-- Daily at 03:00 UTC — cancel unpaid pending bookings older than 7 days.
SELECT cron.schedule(
  'carvan-expire-pending',
  '0 3 * * *',
  $$SELECT public.expire_stale_pending_bookings(interval '7 days');$$
);
