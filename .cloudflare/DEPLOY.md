# Cloudflare Workers deploy

## Build & deploy commands (dashboard)

| Step | Command |
|------|---------|
| **Build** | `npm run pages:build` |
| **Deploy** | `npm run cf:deploy` |

Do **not** use `npx wrangler deploy` alone unless `pages:build` has already run in the same job.

## Runtime (must match `wrangler.jsonc`)

- **Compatibility date:** `2025-04-01` or later (required so Worker secrets populate `process.env`, and for Node.js built-ins during deploy)
- **Compatibility flags:** `nodejs_compat`

In the Cloudflare dashboard → **Settings → Runtime**, either sync from the repo or set the same values. If the dashboard shows an older date (e.g. `2024-09-23`), runtime secrets such as `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` will not be visible to API routes even when set in the dashboard.

## Environment variables

Set **runtime** production values in **Variables and secrets** (Production). `NEXT_PUBLIC_*` keys used in the client bundle should also be set under **Build variables and secrets** when using Workers Builds.

`NEXT_PUBLIC_APP_URL` must be your Workers URL, not `http://localhost:3000`.

### Resend (transactional email)

| Variable | Type | Notes |
|----------|------|--------|
| `RESEND_API_KEY` | Runtime **secret** | Exact name — from [resend.com](https://resend.com) |
| `RESEND_FROM_EMAIL` | Runtime variable | e.g. `noreply@airporthub.co.uk` (verified domain) |
| `RESEND_FROM_NAME` | Runtime variable | e.g. `AirportHub` |

After deploy, `GET /api/health` should show `resendApiKeyConfigured: true`, `resendFromEmailConfigured: true`, and `emailConfigured: true`.

Required for address autocomplete / geocoding:

| Variable | Notes |
|----------|--------|
| `GEOAPIFY_API_KEY` | Server-side Geoapify key (recommended). Use a key **without** HTTP referrer restrictions, or Geoapify will reject Worker `fetch` calls. |

After deploy, check `GET /api/health` — `geoapifyConfigured` must be `true`. If autocomplete returns `503` with `geoapify_not_configured`, add the variable and redeploy.

### Stripe (payment step)

| Variable | Where to set | Notes |
|----------|----------------|-------|
| `STRIPE_SECRET_KEY` | Runtime secret | Server-side PaymentIntent creation |
| `STRIPE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **Build** variable (recommended) + runtime | Publishable key for Stripe.js. On Workers, runtime-only `NEXT_PUBLIC_*` is **not** inlined into the client bundle — set it as a **Build** variable, or rely on `publishable_key` returned by `POST /api/stripe/payment-intent` after deploy. |
| `STRIPE_WEBHOOK_SECRET` | Runtime secret | Webhook signature verification |

After deploy, verify:

- `GET /api/health` includes `stripePublishableKeyConfigured: true`
- `POST /api/stripe/payment-intent` returns `publishable_key` and `client_secret`
- `/payment` shows the Stripe card form (not only the page header)
