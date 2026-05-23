-- Quote pricing: minimum fare on base pricing, predefined rule keys on price_rules

ALTER TABLE public.operator_base_pricing
  ADD COLUMN IF NOT EXISTS minimum_fare NUMERIC(10, 2) NOT NULL DEFAULT 5.00;

ALTER TABLE public.price_rules
  ADD COLUMN IF NOT EXISTS rule_key TEXT;

ALTER TABLE public.price_rules
  ADD COLUMN IF NOT EXISTS time_start TIME;

ALTER TABLE public.price_rules
  ADD COLUMN IF NOT EXISTS time_end TIME;

-- Remove legacy free-form rules without a predefined key (optional clean slate)
DELETE FROM public.price_rules WHERE rule_key IS NULL;

ALTER TABLE public.price_rules
  ALTER COLUMN rule_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_rules_operator_rule_key
  ON public.price_rules (operator_id, rule_key);

-- Backfill base pricing for operators missing a row
INSERT INTO public.operator_base_pricing (
  operator_id,
  base_fare,
  per_mile,
  per_minute,
  minimum_fare
)
SELECT
  o.id,
  o.base_price,
  2.50,
  0.35,
  GREATEST(o.base_price, 5.00)
FROM public.operators o
WHERE NOT EXISTS (
  SELECT 1
  FROM public.operator_base_pricing obp
  WHERE obp.operator_id = o.id
);
