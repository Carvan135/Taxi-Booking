-- Extra operator profile fields (business + fleet summary for settings UI)
ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS business_description TEXT,
  ADD COLUMN IF NOT EXISTS fleet_vehicle_count INT NOT NULL DEFAULT 1
    CHECK (fleet_vehicle_count >= 1 AND fleet_vehicle_count <= 999),
  ADD COLUMN IF NOT EXISTS fleet_vehicle_types TEXT;

COMMENT ON COLUMN public.operators.business_address IS 'Business / depot address (operator profile)';
COMMENT ON COLUMN public.operators.business_description IS 'Public-facing business description';
COMMENT ON COLUMN public.operators.fleet_vehicle_count IS 'Reported number of active vehicles';
COMMENT ON COLUMN public.operators.fleet_vehicle_types IS 'Comma-separated or free-text fleet types, e.g. Sedan, SUV';
