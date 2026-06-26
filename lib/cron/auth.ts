import { getRuntimeEnv } from "@/lib/env/runtime";

/** Reject unauthenticated cron calls in production when CRON_SECRET is set. */
export function authorizeCronRequest(req: Request): boolean {
  const secret = getRuntimeEnv("CRON_SECRET");
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret === secret) return true;

  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export function cronRequestHeaders(secret: string | undefined): HeadersInit {
  if (!secret?.trim()) return {};
  return { Authorization: `Bearer ${secret.trim()}` };
}
