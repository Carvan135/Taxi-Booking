-- Operator starts journey at customer pickup

ALTER TYPE public.booking_status_enum ADD VALUE IF NOT EXISTS 'in_progress';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS journey_started_at TIMESTAMPTZ;

ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'journey_started';
