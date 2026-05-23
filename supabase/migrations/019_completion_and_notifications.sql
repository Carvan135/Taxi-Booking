-- Model B completion flow, operator pause, in-app notifications

DO $$ BEGIN
  CREATE TYPE public.completion_status_enum AS ENUM (
    'none',
    'operator_marked_complete',
    'customer_confirmed',
    'auto_completed',
    'disputed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type_enum AS ENUM (
    'booking_confirmed',
    'operator_assigned',
    'operator_marked_complete',
    'completion_confirmed',
    'auto_complete_warning',
    'auto_completed',
    'dispute_raised',
    'dispute_resolved',
    'payout_released',
    'booking_cancelled',
    'stripe_connected',
    'new_booking_assigned'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status_enum AS ENUM ('unread', 'read');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS completion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_requested_by UUID REFERENCES public.profiles (id),
  ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_complete_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_raised_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS completion_status public.completion_status_enum DEFAULT 'none';

ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ;

INSERT INTO public.platform_settings (key, value, description)
VALUES
  (
    'auto_complete_hours',
    '24',
    'Hours after operator marks complete before auto-completion triggers'
  ),
  (
    'auto_complete_warning_hours',
    '2',
    'Hours before auto-complete to send customer warning notification'
  )
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type public.notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status public.notification_status_enum NOT NULL DEFAULT 'unread',
  booking_id UUID REFERENCES public.bookings (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notifications_user_unread
  ON public.notifications (user_id, status)
  WHERE status = 'unread';

CREATE INDEX IF NOT EXISTS notifications_user_created
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_service_role_all" ON public.notifications;
CREATE POLICY "notifications_service_role_all"
  ON public.notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
