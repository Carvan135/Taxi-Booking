-- Fix "infinite recursion detected in policy for relation profiles".
-- Cause: profiles policies join operators → operators policies read profiles again.
-- Fix: role checks via SECURITY DEFINER helpers that read profiles once (no RLS re-entry).

-- ---------------------------------------------------------------------------
-- Auth helpers (SECURITY DEFINER = read profiles without applying profiles RLS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS public.user_role_enum
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.auth_user_role() = 'admin'::public.user_role_enum;
$$;

CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.auth_user_role() = 'customer'::public.user_role_enum;
$$;

CREATE OR REPLACE FUNCTION public.is_operator_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.auth_user_role() = 'operator'::public.user_role_enum;
$$;

REVOKE ALL ON FUNCTION public.auth_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_customer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_operator_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_customer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_operator_user() TO authenticated;

-- ---------------------------------------------------------------------------
-- operators: stop reading profiles inside RLS (breaks recursion with profiles)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "operators_select_approved_for_customers" ON public.operators;

CREATE POLICY "operators_select_approved_for_customers"
  ON public.operators
  FOR SELECT
  TO authenticated
  USING (
    status = 'approved'::public.operator_status_enum
    AND public.is_customer()
  );

-- ---------------------------------------------------------------------------
-- profiles: ensure admin policy uses fixed is_admin() (idempotent)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
