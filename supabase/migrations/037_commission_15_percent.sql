-- Raise default platform commission from 10% to 15%.
UPDATE public.platform_settings
SET
  value = '15',
  description = 'Platform commission percentage applied to all bookings'
WHERE key = 'commission_percentage'
  AND value = '10';
