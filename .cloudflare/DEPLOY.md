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
