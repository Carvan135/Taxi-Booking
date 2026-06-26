-- Align booking service_type with operator fleet vehicle categories.

ALTER TABLE public.bookings
  ALTER COLUMN service_type DROP DEFAULT;

ALTER TABLE public.bookings
  ALTER COLUMN service_type TYPE text
  USING service_type::text;

UPDATE public.bookings
SET service_type = CASE service_type
  WHEN 'standard' THEN 'Saloon'
  WHEN 'executive' THEN 'Executive'
  WHEN 'van' THEN 'MPV'
  WHEN 'suv' THEN 'Estate'
  ELSE service_type
END;

CREATE TYPE public.service_type_enum_new AS ENUM (
  'Saloon',
  'EV',
  'Estate',
  'MPV',
  'Executive',
  '8 Seater',
  'Luxury'
);

ALTER TABLE public.bookings
  ALTER COLUMN service_type TYPE public.service_type_enum_new
  USING service_type::public.service_type_enum_new;

DROP TYPE public.service_type_enum;

ALTER TYPE public.service_type_enum_new RENAME TO service_type_enum;

ALTER TABLE public.bookings
  ALTER COLUMN service_type SET DEFAULT 'Saloon'::public.service_type_enum;
