-- Replace preferred language with luggage count (pieces)

ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS language;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS luggage INT NOT NULL DEFAULT 0;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_luggage_range;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_luggage_range CHECK (luggage >= 0 AND luggage <= 10);

COMMENT ON COLUMN public.bookings.luggage IS
  'Number of luggage pieces for the journey.';
