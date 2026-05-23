-- Remove operator_assigned and in_progress from booking_status_enum.
-- Operator is set at booking creation; payment webhook moves status to confirmed.

ALTER TABLE public.bookings
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.bookings
  ALTER COLUMN status TYPE text
  USING status::text;

UPDATE public.bookings
SET status = 'confirmed'
WHERE status IN ('operator_assigned', 'in_progress');

CREATE TYPE public.booking_status_enum_new AS ENUM (
  'pending',
  'confirmed',
  'completed',
  'cancelled'
);

ALTER TABLE public.bookings
  ALTER COLUMN status TYPE public.booking_status_enum_new
  USING status::public.booking_status_enum_new;

DROP TYPE public.booking_status_enum;

ALTER TYPE public.booking_status_enum_new RENAME TO booking_status_enum;

ALTER TABLE public.bookings
  ALTER COLUMN status SET DEFAULT 'pending'::public.booking_status_enum;
