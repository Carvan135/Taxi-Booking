-- Notify operators when a customer leaves a booking review.

ALTER TYPE public.notification_type_enum ADD VALUE IF NOT EXISTS 'customer_review_received';
