# Appwrite Sites (Next.js SSR)

## Build settings

| Setting | Value |
|--------|--------|
| Framework | Next.js |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `./.next` |
| Node runtime | 20 or 22 (match `build_runtime`) |

Do **not** set `output: "standalone"` in `next.config.mjs` (Vercel-only; breaks Appwrite SSR bundling).

## Environment variables (Site → Variables)

Set these in the Appwrite console for **both build and runtime** (import from `.env.example`).

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (API routes, webhooks) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes (payments) |
| `STRIPE_SECRET_KEY` | Yes |
| `STRIPE_WEBHOOK_SECRET` | Yes |
| `NEXT_PUBLIC_GEOAPIFY_API_KEY` | Yes (booking map) |
| `NEXT_PUBLIC_APP_URL` | Yes — use your **production** site URL (not `localhost`) |

Mark secrets as **Secret** in Appwrite.

## After deploy

1. Open `https://<your-site>/api/health` — expect `{"ok":true,"supabasePublicEnv":true,...}`.
2. If `supabasePublicEnv` is `false`, variables are missing at **runtime**.
3. In Site settings, raise **Runtime** resources (e.g. 1 CPU, 1024 MB RAM). Large `.next` + `node_modules` bundles (~700MB packaged) need headroom on cold start.

## Common 500 causes

- `NEXT_PUBLIC_SUPABASE_*` not set on the site (middleware and layouts call Supabase on every page).
- `NEXT_PUBLIC_APP_URL` still pointing at `localhost` (breaks Stripe Connect redirects, not usually a 500 on `/`).
- Runtime OOM / slow cold start — increase CPU/RAM or reduce deployment size.
