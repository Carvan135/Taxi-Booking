-- Stripe Connect payout flags (Stage 1 account id + onboarding flags exist from 001)
ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMPTZ;

COMMENT ON COLUMN public.operators.stripe_payouts_enabled IS 'True when Stripe has enabled payouts for the connected account';
COMMENT ON COLUMN public.operators.stripe_connected_at IS 'First time payouts_enabled became true (webhook)';
