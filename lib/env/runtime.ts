import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Read a server-side secret/env var in local dev and on Cloudflare Workers.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time and are not handled here.
 * Runtime Worker secrets may be on `getCloudflareContext().env` when
 * `process.env` is not populated (e.g. compatibility_date before 2025-04-01).
 */
export function getRuntimeEnv(name: string): string | undefined {
  const fromProcess = process.env[name];
  if (typeof fromProcess === "string" && fromProcess.trim()) {
    return fromProcess.trim();
  }

  try {
    const { env } = getCloudflareContext();
    const value = (env as Record<string, unknown>)[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  } catch {
    // Local `next dev`, build, or outside a Worker request context.
  }

  return undefined;
}
