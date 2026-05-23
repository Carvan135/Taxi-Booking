-- Roll back 013 + 014 (operator contact RLS + RPC).

DROP FUNCTION IF EXISTS public.customer_booking_operator_contacts(uuid[]);

DROP POLICY IF EXISTS "operators_select_on_customer_booking" ON public.operators;

DROP POLICY IF EXISTS "profiles_select_operator_for_customer_booking" ON public.profiles;
