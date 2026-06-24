-- SMS pickup reminders: idempotency column, platform settings, audit log.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS sms_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_phone_verified BOOLEAN DEFAULT false;

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('sms_reminder_hours_before', '2', 'Hours before pickup to send SMS reminder'),
  ('sms_reminders_enabled', 'true', 'Master toggle for SMS reminder feature')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  phone_to TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  twilio_sid TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_booking_created
  ON public.sms_logs (booking_id, created_at DESC)
  WHERE booking_id IS NOT NULL;

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_logs_service_role_all" ON public.sms_logs;
CREATE POLICY "sms_logs_service_role_all"
  ON public.sms_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "sms_logs_admin_select" ON public.sms_logs;
CREATE POLICY "sms_logs_admin_select"
  ON public.sms_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'::public.user_role_enum
    )
  );
