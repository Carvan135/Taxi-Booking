# Carvan (TaxiBook)

Customer–operator taxi booking marketplace for the UK. Milestone 1 focuses on auth, operator onboarding, Supabase data layer, and Stripe Connect (test mode) scaffolding.

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

   Copy `.env.example` to `.env.local` and fill in values from the Supabase project (**Settings → API**) and Stripe (**Developers → API keys**, test mode).

   ```bash
   cp .env.example .env.local
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

## Deployment (Vercel + GitHub)

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
