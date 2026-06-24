-- Expand operator vehicle types for UK fleet categories and multi-select fleet.

ALTER TABLE public.operators
  DROP CONSTRAINT IF EXISTS operators_vehicle_type_check;

UPDATE public.operators
SET vehicle_type = 'Saloon'
WHERE vehicle_type = 'Sedan';

UPDATE public.operators
SET fleet_vehicle_types = REPLACE(fleet_vehicle_types, 'Sedan', 'Saloon')
WHERE fleet_vehicle_types IS NOT NULL
  AND fleet_vehicle_types LIKE '%Sedan%';

UPDATE public.operators
SET fleet_vehicle_types = vehicle_type
WHERE (fleet_vehicle_types IS NULL OR TRIM(fleet_vehicle_types) = '')
  AND vehicle_type IS NOT NULL;

ALTER TABLE public.operators
  ADD CONSTRAINT operators_vehicle_type_check
  CHECK (
    vehicle_type IN (
      'Saloon',
      'EV',
      'Estate',
      'MPV',
      'Executive',
      '8 Seater',
      'Luxury',
      'Sedan',
      'SUV',
      'Van'
    )
  );
