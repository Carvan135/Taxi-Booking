-- M2: Booking schema — enums, booking columns, pricing tables, RLS updates
-- Requires: 001_initial_schema.sql

-- ============================================
-- STEP 1: Create all enums (idempotent)
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.booking_type_enum AS ENUM ('one_way', 'return');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_leg_enum AS ENUM ('outbound', 'return');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status_enum AS ENUM (
    'pending',
    'confirmed',
    'operator_assigned',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status_enum AS ENUM ('unpaid', 'paid', 'refunded', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.service_type_enum AS ENUM ('standard', 'executive', 'van', 'suv');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.rule_type_enum AS ENUM ('multiplier', 'fixed_fee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.operator_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role_enum AS ENUM ('customer', 'operator', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STEP 2: Convert TEXT + CHECK columns to enums
-- ============================================
-- Postgres blocks ALTER TYPE when RLS policies / functions reference the column.

DROP POLICY IF EXISTS "operators_select_approved_for_customers" ON public.operators;
DROP POLICY IF EXISTS "operators_admin_all" ON public.operators;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "bookings_admin_all" ON public.bookings;
DROP POLICY IF EXISTS "operator_licenses_select_admin" ON storage.objects;

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.customer_cancel_booking(uuid);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.profiles
  ALTER COLUMN role TYPE public.user_role_enum
  USING role::public.user_role_enum;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'customer'::public.user_role_enum;

ALTER TABLE public.operators
  DROP CONSTRAINT IF EXISTS operators_status_check;

ALTER TABLE public.operators
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.operators
  ALTER COLUMN status TYPE public.operator_status_enum
  USING status::public.operator_status_enum;

ALTER TABLE public.operators
  ALTER COLUMN status SET DEFAULT 'pending'::public.operator_status_enum;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.bookings
  ALTER COLUMN status TYPE public.booking_status_enum
  USING status::public.booking_status_enum;

ALTER TABLE public.bookings
  ALTER COLUMN status SET DEFAULT 'pending'::public.booking_status_enum;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

ALTER TABLE public.bookings
  ALTER COLUMN payment_status DROP DEFAULT;

ALTER TABLE public.bookings
  ALTER COLUMN payment_status TYPE public.payment_status_enum
  USING payment_status::public.payment_status_enum;

ALTER TABLE public.bookings
  ALTER COLUMN payment_status SET DEFAULT 'unpaid'::public.payment_status_enum;

-- Guest bookings: customer_id may be null
ALTER TABLE public.bookings
  ALTER COLUMN customer_id DROP NOT NULL;

-- Restore policies/functions dropped for ALTER TYPE (bookings_admin_all recreated in STEP 5)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'::public.user_role_enum
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "operators_select_approved_for_customers"
  ON public.operators
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved'::public.operator_status_enum
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'customer'::public.user_role_enum
    )
  );

CREATE POLICY "operators_admin_all"
  ON public.operators
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "operator_licenses_select_admin"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'operator-licenses'
    AND public.is_admin()
  );

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

REVOKE ALL ON FUNCTION public.customer_cancel_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_cancel_booking(uuid) TO authenticated;

-- ============================================
-- STEP 3: New booking columns
-- ============================================
-- Status flow: pending → confirmed → operator_assigned → completed
-- cancelled from pending or confirmed only

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_type public.booking_type_enum DEFAULT 'one_way',
  ADD COLUMN IF NOT EXISTS group_reference TEXT,
  ADD COLUMN IF NOT EXISTS leg public.booking_leg_enum DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS service_type public.service_type_enum DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS return_date DATE,
  ADD COLUMN IF NOT EXISTS return_time TIME,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_status public.payment_status_enum DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS platform_commission NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS operator_payout NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payout_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_eligible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- stripe_payment_intent_id, notes, passengers may already exist from M1

-- ============================================
-- STEP 4: New tables
-- ============================================

CREATE TABLE IF NOT EXISTS public.price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type public.rule_type_enum NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_rules_operator_id ON public.price_rules (operator_id);

CREATE TABLE IF NOT EXISTS public.operator_base_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators (id) ON DELETE CASCADE UNIQUE,
  base_fare NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
  per_mile NUMERIC(10, 2) NOT NULL DEFAULT 2.50,
  per_minute NUMERIC(10, 2) NOT NULL DEFAULT 0.35,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operator_base_pricing_operator_id
  ON public.operator_base_pricing (operator_id);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (key, value, description)
VALUES
  (
    'commission_percentage',
    '10',
    'Platform commission percentage applied to all bookings'
  ),
  (
    'payout_delay_hours',
    '48',
    'Hours after booking completion before payout is released'
  ),
  (
    'payout_early_release_enabled',
    'true',
    'Allow admin to release payouts early'
  )
ON CONFLICT (key) DO NOTHING;

-- updated_at triggers for new tables
DROP TRIGGER IF EXISTS price_rules_set_updated_at ON public.price_rules;
CREATE TRIGGER price_rules_set_updated_at
  BEFORE UPDATE ON public.price_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS operator_base_pricing_set_updated_at ON public.operator_base_pricing;
CREATE TRIGGER operator_base_pricing_set_updated_at
  BEFORE UPDATE ON public.operator_base_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS platform_settings_set_updated_at ON public.platform_settings;
CREATE TRIGGER platform_settings_set_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- RLS helpers
-- ============================================

CREATE OR REPLACE FUNCTION public.current_operator_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM public.operators o
  WHERE o.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_operator_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_operator_id() TO authenticated;

-- ============================================
-- STEP 5: Row Level Security
-- ============================================

ALTER TABLE public.price_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_base_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- ---------- price_rules ----------

CREATE POLICY "price_rules_select_own"
  ON public.price_rules
  FOR SELECT
  TO authenticated
  USING (operator_id = public.current_operator_id());

CREATE POLICY "price_rules_insert_own"
  ON public.price_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (operator_id = public.current_operator_id());

CREATE POLICY "price_rules_update_own"
  ON public.price_rules
  FOR UPDATE
  TO authenticated
  USING (operator_id = public.current_operator_id())
  WITH CHECK (operator_id = public.current_operator_id());

CREATE POLICY "price_rules_delete_own"
  ON public.price_rules
  FOR DELETE
  TO authenticated
  USING (operator_id = public.current_operator_id());

CREATE POLICY "price_rules_select_active_approved"
  ON public.price_rules
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.operators o
      WHERE o.id = price_rules.operator_id
        AND o.status = 'approved'::public.operator_status_enum
    )
  );

CREATE POLICY "price_rules_admin_all"
  ON public.price_rules
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "price_rules_service_role_all"
  ON public.price_rules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------- operator_base_pricing ----------

CREATE POLICY "operator_base_pricing_select_own"
  ON public.operator_base_pricing
  FOR SELECT
  TO authenticated
  USING (operator_id = public.current_operator_id());

CREATE POLICY "operator_base_pricing_insert_own"
  ON public.operator_base_pricing
  FOR INSERT
  TO authenticated
  WITH CHECK (operator_id = public.current_operator_id());

CREATE POLICY "operator_base_pricing_update_own"
  ON public.operator_base_pricing
  FOR UPDATE
  TO authenticated
  USING (operator_id = public.current_operator_id())
  WITH CHECK (operator_id = public.current_operator_id());

CREATE POLICY "operator_base_pricing_select_approved"
  ON public.operator_base_pricing
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.operators o
      WHERE o.id = operator_base_pricing.operator_id
        AND o.status = 'approved'::public.operator_status_enum
    )
  );

CREATE POLICY "operator_base_pricing_admin_all"
  ON public.operator_base_pricing
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "operator_base_pricing_service_role_all"
  ON public.operator_base_pricing
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------- platform_settings ----------

CREATE POLICY "platform_settings_admin_all"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "platform_settings_service_role_all"
  ON public.platform_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------- bookings (replace M1 policies) ----------

DROP POLICY IF EXISTS "bookings_select_own_customer" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_customer" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_assigned_operator" ON public.bookings;
DROP POLICY IF EXISTS "bookings_admin_all" ON public.bookings;

-- Guests: create booking without auth
CREATE POLICY "bookings_insert_guest"
  ON public.bookings
  FOR INSERT
  TO anon
  WITH CHECK (customer_id IS NULL);

-- Guests: read guest bookings only (app must filter by id + customer_email)
CREATE POLICY "bookings_select_guest"
  ON public.bookings
  FOR SELECT
  TO anon
  USING (customer_id IS NULL);

-- Logged-in customers: own bookings
CREATE POLICY "bookings_select_own_customer"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "bookings_insert_customer"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IS NULL
    OR customer_id = auth.uid()
  );

CREATE POLICY "bookings_select_assigned_operator"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    operator_id IS NOT NULL
    AND operator_id = public.current_operator_id()
  );

CREATE POLICY "bookings_update_assigned_operator"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (operator_id = public.current_operator_id())
  WITH CHECK (operator_id = public.current_operator_id());

CREATE POLICY "bookings_admin_all"
  ON public.bookings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- bookings_service_role_all from 001 is unchanged
