# Cloudflare Workers deploy

## Build & deploy commands (dashboard)

| Step | Command |
|------|---------|
| **Build** | `npm run pages:build` |
| **Deploy** | `npm run cf:deploy` |

Do **not** use `npx wrangler deploy` alone unless `pages:build` has already run in the same job.

## Runtime (must match `wrangler.jsonc`)

- **Compatibility date:** `2025-04-01` or later (required so Worker secrets populate `process.env`, and for Node.js built-ins during deploy)
- **Compatibility flags:** `nodejs_compat`, `nodejs_compat_populate_process_env`

In the Cloudflare dashboard → **Settings → Runtime**, either sync from the repo or set the same values. If the dashboard shows an older date (e.g. `2024-09-23`), runtime secrets such as `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` will not be visible to API routes even when set in the dashboard.

## Environment variables — two places (Workers Builds)

With **Workers Builds** (Git deploy), Cloudflare has **two separate** env screens. Both are required.

| Where | Path in dashboard | Used for |
|--------|-------------------|----------|
| **Build** | Workers Builds → your build → **Build variables and secrets** | `NEXT_PUBLIC_*` inlined into the client bundle during `npm run pages:build` |
| **Runtime** | Workers & Pages → **taxi-booking** → **Settings → Variables and secrets** → **Production** | API routes (`/api/*`), email, Stripe server, Twilio, cron |

**Common mistake:** adding `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc. only under **Workers Builds → Environment variables**. Those are **not** available to `/api/health` or other API routes at runtime.

**Payment sync failure (503 after Stripe succeeds):** `SUPABASE_SERVICE_ROLE_KEY` must be the **service_role** JWT from Supabase → Settings → API — not the `anon` / public key. With the anon key, guest draft inserts succeed (RLS allows anon INSERT) but payment-status UPDATEs are blocked (0 rows), so `/api/bookings/create` returns 503 and webhooks return 200 without updating the row. After deploy, `GET /api/health` includes `supabaseServiceRoleKeyValid: true`.

After deploy, `GET /api/health` includes a `runtime` object:

- `bindingKeys` — Worker bindings visible to the app (should list your secret names if runtime vars are set)
- `probes` — booleans showing whether each var is visible via `process.env` or Cloudflare bindings

If `checks.resendApiKeyConfigured` is `false` but vars appear in the Builds env table, add them again under **Worker → Settings → Variables and secrets (Production)** and redeploy.

Use `npm run cf:deploy` (includes `--keep-vars`) so dashboard runtime vars are not removed on deploy.

`NEXT_PUBLIC_APP_URL` must be your production URL, not `http://localhost:3000`.

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
| `STRIPE_WEBHOOK_SECRET` | Runtime secret | Signing secret for **platform** webhook (Events from: **Your account**) |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Runtime secret | Signing secret for **Connect** webhook (Events from: **Connected accounts**) |

**Two Stripe webhooks, same URL** (`https://airporthub.co.uk/api/webhooks/stripe`):

| Webhook | Events from | Subscribe to | Cloudflare secret |
|---------|-------------|--------------|-------------------|
| **Platform** (add new) | **Your account** | `payment_intent.succeeded`, `payment_intent.payment_failed` | `STRIPE_WEBHOOK_SECRET` |
| **Connect** (existing e.g. whimsical-serenity) | **Connected accounts** | `account.updated` | `STRIPE_CONNECT_WEBHOOK_SECRET` |

Setup (test mode until go-live):

1. Stripe Dashboard → **Developers → Webhooks** (ensure **Test mode** / sandbox).
2. **Add endpoint** → URL `https://airporthub.co.uk/api/webhooks/stripe` → **Your account** → select `payment_intent.succeeded`, `payment_intent.payment_failed` → copy signing secret → `STRIPE_WEBHOOK_SECRET`.
3. Keep or recreate the **Connect** endpoint → same URL → **Connected accounts** → `account.updated` → copy signing secret → `STRIPE_CONNECT_WEBHOOK_SECRET`.
4. Send a **test webhook** from each endpoint; both should return **200**.
5. Failed deliveries with **400** mean the wrong secret is in Cloudflare for that endpoint.

Note: the customer booking flow finalizes via `POST /api/bookings/create` after payment. Webhooks are a safety net (payment sync + confirmation email + operator Connect status).

After deploy, verify:

- `GET /api/health` includes `stripeWebhookSecretConfigured: true` and `stripeConnectWebhookSecretConfigured: true`
- `POST /api/stripe/payment-intent` returns `publishable_key` and `client_secret`
- `/payment` shows the Stripe card form (not only the page header)

### Cron (scheduled jobs)

| Variable | Type | Notes |
|----------|------|--------|
| `CRON_SECRET` | Runtime **secret** | Required in production. Cloudflare Cron Triggers call `/api/cron/auto-complete`, `/api/cron/reconcile-payments`, and `/api/cron/sms-reminders` with `Authorization: Bearer <secret>`. |
| `TWILIO_ACCOUNT_SID` | Runtime secret | SMS pickup reminders |
| `TWILIO_AUTH_TOKEN` | Runtime secret | SMS pickup reminders |
| `TWILIO_PHONE_NUMBER` | Runtime variable | E.164 sender number |
| `RESEND_*` | Runtime | Auto-complete warning + receipt emails |

Cron schedules are defined in `wrangler.jsonc` (`*/15 * * * *` — every 15 minutes). Entry point: `cloudflare-worker.ts` (wraps OpenNext + `scheduled` handler). The reconcile-payments job syncs unpaid bookings that already have a Stripe PaymentIntent id (safety net when webhooks lag).

**Expire-pending** (daily cleanup of stale unpaid bookings) runs in **Supabase `pg_cron`**, not Cloudflare. Apply migration `036_cloudflare_auto_complete_cron.sql` so the old Supabase auto-complete schedule is removed.

After deploy:

1. `GET /api/health` → `cronSecretConfigured: true`, `smsConfigured: true`, `emailConfigured: true`
2. Manual test:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://airporthub.co.uk/api/cron/auto-complete
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://airporthub.co.uk/api/cron/reconcile-payments
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://airporthub.co.uk/api/cron/sms-reminders
   ```
3. Supabase SQL: `SELECT jobid, jobname, schedule FROM cron.job;` — expect **`carvan-expire-pending`** only (not `carvan-auto-complete`).
