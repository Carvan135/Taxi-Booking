-- Preferred language for the trip (customer selection at booking)

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'english';

COMMENT ON COLUMN public.bookings.language IS
  'Customer preferred language for the journey (e.g. english, arabic).';
