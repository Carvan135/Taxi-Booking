// Custom Worker entry: OpenNext fetch handler + Cloudflare Cron Triggers.
// Build first (`npm run pages:build`) so `.open-next/worker.js` exists.

// @ts-expect-error generated at build time
import { default as handler } from "./.open-next/worker.js";

/** Must match `triggers.crons` in wrangler.jsonc */
export const CRON_SCHEDULE_APP_JOBS = "*/15 * * * *";

type ServiceFetcher = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

type CronWorkerEnv = {
  CRON_SECRET?: string;
  NEXT_PUBLIC_APP_URL?: string;
  WORKER_SELF_REFERENCE?: ServiceFetcher;
};

async function invokeCronRoute(
  env: CronWorkerEnv,
  path: string,
): Promise<void> {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) {
    console.error(`Cron ${path} skipped: CRON_SECRET is not configured`);
    return;
  }

  const headers = new Headers(cronRequestHeaders(secret));
  const request = new Request(`https://carvan.internal${path}`, {
    method: "GET",
    headers,
  });

  let response: Response;
  if (env.WORKER_SELF_REFERENCE) {
    response = await env.WORKER_SELF_REFERENCE.fetch(request);
  } else {
    const base = env.NEXT_PUBLIC_APP_URL?.trim();
    if (!base) {
      console.error(
        `Cron ${path} skipped: no WORKER_SELF_REFERENCE and NEXT_PUBLIC_APP_URL unset`,
      );
      return;
    }
    response = await fetch(new URL(path, base), { method: "GET", headers });
  }

  const body = await response.text();
  if (!response.ok) {
    console.error(`Cron ${path} failed (${response.status}):`, body);
    return;
  }

  console.log(`Cron ${path} ok (${response.status}):`, body);
}

function cronRequestHeaders(secret: string): HeadersInit {
  return { Authorization: `Bearer ${secret}` };
}

export default {
  fetch: handler.fetch,

  async scheduled(
    event: { cron: string },
    env: CronWorkerEnv,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ) {
    if (event.cron !== CRON_SCHEDULE_APP_JOBS) {
      console.warn("Unhandled cron schedule:", event.cron);
      return;
    }

    ctx.waitUntil(
      (async () => {
        await invokeCronRoute(env, "/api/cron/auto-complete");
        await invokeCronRoute(env, "/api/cron/sms-reminders");
      })(),
    );
  },
};
