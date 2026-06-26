-- Auto-complete now runs on Cloudflare Cron Triggers (full Next.js job: emails + payouts).
-- This removes the Supabase pg_cron → Edge Function schedule to avoid duplicate runs.
-- The Edge Function remains available for manual invoke; expire-pending pg_cron is unchanged.

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'carvan-auto-complete') THEN
    PERFORM cron.unschedule('carvan-auto-complete');
  END IF;
END;
$cron$;
