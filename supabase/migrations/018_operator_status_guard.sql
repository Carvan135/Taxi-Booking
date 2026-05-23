-- Operators must not self-approve: enforce pending on insert and block status changes unless admin.

DROP POLICY IF EXISTS "operators_insert_own" ON public.operators;

CREATE POLICY "operators_insert_own"
  ON public.operators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'::public.operator_status_enum
  );

CREATE OR REPLACE FUNCTION public.guard_operator_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending'::public.operator_status_enum
       AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Operator applications must start as pending'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT public.is_admin() THEN
    -- Non-admins may only move back to pending (e.g. re-application after rejection).
    IF NEW.status = 'pending'::public.operator_status_enum THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Operator status can only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operators_guard_status ON public.operators;

CREATE TRIGGER operators_guard_status
  BEFORE INSERT OR UPDATE OF status ON public.operators
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_operator_status_change();
