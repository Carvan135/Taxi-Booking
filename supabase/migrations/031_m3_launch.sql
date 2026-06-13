-- M3 launch: cancellation policy settings, refund/cancellation audit on bookings, email delivery log.
-- GOAL: every refund, cancellation, and transactional email is traceable per booking.
-- Requires: 009_m2_booking_schema.sql (platform_settings), 017+ (is_admin).

-- ---------------------------------------------------------------------------
-- Cancellation policy settings
-- ---------------------------------------------------------------------------

INSERT INTO public.platform_settings (key, value, description)
VALUES
  (
    'cancellation_cutoff_hours',
    '24',
    'Hours before pickup after which cancellation is not allowed'
  ),
  (
    'cancellation_full_refund_hours',
    '24',
    'Hours before pickup that qualify for full refund'
  ),
  (
    'partial_refund_enabled',
    'true',
    'Allow admin to issue partial refunds on disputes'
  )
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Refund & cancellation audit on bookings
-- ---------------------------------------------------------------------------

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS refund_type TEXT CHECK (
    refund_type IN ('full', 'partial', 'none')
  ),
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES public.profiles (id),
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles (id);

CREATE INDEX IF NOT EXISTS idx_bookings_stripe_refund_id
  ON public.bookings (stripe_refund_id)
  WHERE stripe_refund_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_refunded_at
  ON public.bookings (refunded_at DESC)
  WHERE refunded_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at
  ON public.bookings (cancelled_at DESC)
  WHERE cancelled_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Email delivery log (one row per send attempt)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings (id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (
    status IN ('sent', 'failed', 'bounced')
  ),
  resend_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_booking_created
  ON public.email_logs (booking_id, created_at DESC)
  WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_user_created
  ON public.email_logs (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_email_type
  ON public.email_logs (email_type, created_at DESC);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_logs_service_role_all" ON public.email_logs;
CREATE POLICY "email_logs_service_role_all"
  ON public.email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "email_logs_admin_select" ON public.email_logs;
CREATE POLICY "email_logs_admin_select"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
