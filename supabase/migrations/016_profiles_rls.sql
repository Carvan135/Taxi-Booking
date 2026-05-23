-- Drop and recreate all RLS policies on public.profiles.
-- Requires public.is_admin() from 009_m2_booking_schema.sql.

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Service role (API routes, webhooks, server jobs)
CREATE POLICY "profiles_service_role_all"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins: read any profile (admin UI, bookings, operators)
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Customers: operator contact (email, phone) on their bookings
CREATE POLICY "profiles_select_operator_for_customer_booking"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      INNER JOIN public.operators o ON o.id = b.operator_id
      WHERE b.customer_id = auth.uid()
        AND o.user_id = profiles.id
    )
  );

-- Operators: customer name/email on bookings assigned to them
CREATE POLICY "profiles_select_customer_for_operator_booking"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      INNER JOIN public.operators o ON o.id = b.operator_id
      WHERE o.user_id = auth.uid()
        AND b.customer_id = profiles.id
    )
  );
