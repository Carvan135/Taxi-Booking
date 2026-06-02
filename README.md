# Carvan (TaxiBook)

Customer–operator taxi booking marketplace for the UK. Milestone 1 focuses on auth, operator onboarding, Supabase data layer, and Stripe Connect (test mode) scaffolding

## Tech stack


- **Framework:** [Next.js](https://nextjs.org/) 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS
- **Auth & data:** [Supabase](https://supabase.com/) (Auth, Postgres, Storage)
- **Payments:** [Stripe](https://stripe.com/) (Connect Express, test keys in development)
- **Forms & validation:** React Hook Form, Zod
- **Client data:** TanStack Query
- **Deployment:** [Vercel](https://vercel.com/) (London `lhr1`), GitHub Actions CI

## Links

| Resource | URL |
| -------- | --- |
| Supabase dashboard | [https://supabase.com/dashboard](https://supabase.com/dashboard) |
| Vercel dashboard | [https://vercel.com/dashboard](https://vercel.com/dashboard) |
| Figma (design) | [https://www.figma.com/](https://www.figma.com/) *(replace with your file)* |

## Local setup

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd carvan
   npm ci
   ```

2. **Environment**

   Copy `.env.example` to `.env` (or `.env.local`) and fill in values from the Supabase project (**Settings → API**) and Stripe (**Developers → API keys**, test mode). Do not commit `.env` or `.env.production`.

   ```bash
   cp .env.example .env
   ```

3. **Supabase**

   - **Hosted:** run SQL migrations in order from `supabase/migrations/` in the Supabase SQL editor (or use the CLI against the remote DB).
   - **Local (optional):** install the [Supabase CLI](https://supabase.com/docs/guides/cli), review `supabase/config.toml`, then:

     ```bash
     supabase start
     supabase db reset   # applies migrations when using local DB workflow
     ```

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## npm scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |

## Deployment

### Netlify

1. Connect the repo and set the build command to `npm run build` (Next.js).
2. Under **Site settings → Build & deploy → Environment → Environment variables**, add every key from `.env.example` with real values (never commit them):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_APP_URL` (your Netlify site URL, e.g. `https://your-site.netlify.app`)
   - Optional: `NEXT_PUBLIC_SUPPORT_EMAIL`
3. **Auto-complete cron (Supabase only — no Netlify setup):** See [Supabase auto-complete cron](#supabase-auto-complete-cron) below.
4. Redeploy after removing `.env` / `.env.production` from the repository. If secrets were ever pushed to a public repo, rotate Stripe and Supabase keys and consider purging git history ([BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) or `git filter-repo`).

### Vercel + GitHub

- Connect the repo to Vercel and import the project (framework: Next.js).
- **Environment variables:** `vercel.json` maps each runtime key to a **Vercel secret reference** (for example `@next_public_supabase_url`). Create matching secrets in the Vercel project or team, **or** remove the `"env"` block from `vercel.json` and define the same variable names from `.env.example` entirely under **Project → Settings → Environment Variables** (the approach Vercel recommends today).
- **Region:** `vercel.json` sets **`lhr1`** (London) for UK / GBP workloads.
- **CI:** `.github/workflows/ci.yml` runs lint, typecheck, and build on pushes and PRs to `main` (dummy env vars are injected for `next build` only).

| Deploy env key | `vercel.json` reference id |
| -------------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` | `@next_public_supabase_url` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `@next_public_supabase_anon_key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `@supabase_service_role_key` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `@next_public_stripe_publishable_key` |
| `STRIPE_SECRET_KEY` | `@stripe_secret_key` |
| `STRIPE_WEBHOOK_SECRET` | `@stripe_webhook_secret` |
| `NEXT_PUBLIC_APP_URL` | `@next_public_app_url` |

### Cloudflare Workers (OpenNext)

If the app is deployed to Cloudflare Workers (for example `*.workers.dev`), **every** variable from `.env.example` must be set in the Worker environment, not only the `NEXT_PUBLIC_*` keys.

1. In **Cloudflare Dashboard → Workers & Pages → your worker → Settings → Variables and secrets**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`SUPABASE_SERVICE_ROLE_KEY`** (required for operator sign-up, webhooks, booking APIs, and guest booking claim; admin dashboard reads settings via the signed-in admin session when this key is missing, but onboarding and payments still need it)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_APP_URL` (your Workers URL, e.g. `https://taxi-booking.example.workers.dev`)
   - **`GEOAPIFY_API_KEY`** (address autocomplete; use a server key without HTTP referrer restrictions)
2. Redeploy after changing secrets.
3. Verify: `GET /api/health` should show `"geoapifyConfigured": true`.
3. **Symptom:** “Application error: a server-side exception has occurred” on `/admin/dashboard` or after sign-in usually means a required secret (often `SUPABASE_SERVICE_ROLE_KEY`) was missing at runtime.

## Supabase auto-complete cron

Booking auto-complete and operator unpause run in a **Supabase Edge Function** on a schedule. No Netlify cron or `CRON_SECRET` is required.

1. Apply migrations (includes `021_supabase_auto_complete_cron.sql`).
2. Enable extensions **pg_cron**, **pg_net**, **supabase_vault** (Database → Extensions).
3. Deploy the function: `supabase functions deploy auto-complete`
4. Create Vault secrets (SQL editor, once per project):

```sql
SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url', 'Supabase API URL');
SELECT vault.create_secret('YOUR_SUPABASE_ANON_KEY', 'publishable_key', 'anon key for scheduled invoke');
```

5. Confirm job **carvan-auto-complete** exists: `SELECT * FROM cron.job;`
6. Manual test: `supabase functions invoke auto-complete --no-verify-jwt` (local) or invoke from Dashboard → Edge Functions.

## Supabase expire-pending cron

Abandoned unpaid bookings (`pending` + `unpaid`, older than 7 days) are cancelled by **pg_cron** calling a Postgres function. No Edge Function or Netlify cron.

1. Apply migrations (includes `028_payment_edge_cases.sql` and `029_expire_pending_cron.sql`).
2. Enable extension **pg_cron** (Database → Extensions) if not already enabled for auto-complete.
3. Confirm job **carvan-expire-pending** exists: `SELECT jobid, jobname, schedule FROM cron.job;`
4. Manual test: `SELECT public.expire_stale_pending_bookings(interval '7 days');` (returns number of rows cancelled).

Schedule: daily at **03:00 UTC**. To change it, update the job in SQL Editor or edit `029_expire_pending_cron.sql` before applying.

## Configuration notes

- **Next.js config:** this repo uses **`next.config.mjs`** (Next.js 14 does not load `next.config.ts`; settings match strict mode, image domains, and production-oriented defaults). Upgrade to Next.js 15+ if you want native `next.config.ts`.
- **Images:** `next.config.mjs` allows `next/image` URLs from `https://*.supabase.co/storage/v1/object/public/**`.

## Milestone 1 — acceptance checklist

- [ ] Supabase project created; migrations `001_initial_schema.sql` and `002_operator_insert_and_storage.sql` applied
- [ ] Row Level Security and policies verified for customers, operators, and admins
- [ ] Auth flows: sign up / sign in / sign out; roles (`customer`, `operator`, `admin`) enforced in middleware and layouts
- [ ] Customer can browse operators and complete booking flow UI through confirmation (test data)
- [ ] Operator onboarding (profile + documents) and operator dashboard accessible with operator role
- [ ] Stripe Connect Express: create account + onboarding link API; `stripe_account_id` stored; callback updates onboarding status (test mode only)
- [ ] `.env.example` documents all required keys; production/staging secrets live in Vercel (or host) only
- [ ] GitHub Actions CI passes on `main`; Vercel deploy succeeds with env vars configured

## License

Private / internal — adjust as needed.
