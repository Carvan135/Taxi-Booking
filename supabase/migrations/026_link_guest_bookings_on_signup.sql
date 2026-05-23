-- Link guest bookings when a customer profile is created; honour role in auth metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role_enum;
BEGIN
  v_role := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'role'), '')::public.user_role_enum,
    'customer'::public.user_role_enum
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    ),
    v_role
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_guest_bookings_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'customer'::public.user_role_enum
     AND NEW.email IS NOT NULL
     AND trim(NEW.email) <> '' THEN
    UPDATE public.bookings
    SET
      customer_id = NEW.id,
      updated_at = now()
    WHERE customer_id IS NULL
      AND lower(trim(customer_email)) = lower(trim(NEW.email));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_link_guest_bookings ON public.profiles;

CREATE TRIGGER profiles_link_guest_bookings
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_guest_bookings_to_profile();
