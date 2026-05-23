-- Schedule auto-complete Edge Function every 15 minutes (pg_cron + pg_net).
-- After deploy, create Vault secrets once (SQL editor):
--   SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url', 'Supabase API URL');
--   SELECT vault.create_secret('YOUR_ANON_KEY', 'publishable_key', 'anon/public key for cron invoke');
--
-- Enable extensions in Dashboard → Database → Extensions if needed: pg_cron, pg_net, supabase_vault
-- Deploy function: supabase functions deploy auto-complete

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DROP FUNCTION IF EXISTS public.invoke_auto_complete_cron();

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'carvan-auto-complete') THEN
    PERFORM cron.unschedule('carvan-auto-complete');
  END IF;
END;
$cron$;

SELECT cron.schedule(
  'carvan-auto-complete',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
      || '/functions/v1/auto-complete',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  ) AS request_id;
  $$
);
