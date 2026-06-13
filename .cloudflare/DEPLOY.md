# Cloudflare Workers deploy

## Build & deploy commands (dashboard)

| Step | Command |
|------|---------|
| **Build** | `npm run pages:build` |
| **Deploy** | `npm run cf:deploy` |

Do **not** use `npx wrangler deploy` alone unless `pages:build` has already run in the same job.

## Runtime (must match `wrangler.jsonc`)

- **Compatibility date:** `2024-09-23` or later (required for Node.js built-ins during deploy)
- **Compatibility flags:** `nodejs_compat`

In the Cloudflare dashboard → **Settings → Runtime**, either sync from the repo or set the same values. If the dashboard shows an older date (e.g. May 2024), deploy will fail with `Could not resolve "fs"` / `async_hooks` errors.

## Environment variables

Set production values in **Variables and secrets**. `NEXT_PUBLIC_APP_URL` must be your Workers URL, not `http://localhost:3000`.

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
