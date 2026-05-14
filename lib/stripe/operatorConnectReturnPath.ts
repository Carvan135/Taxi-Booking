/** Allowed post-Stripe Connect return paths (no open redirects). */
const ALLOWED = new Set([
  "/operator/dashboard",
  "/operator/finances",
  "/operator/profile",
  "/operator/stripe-refresh",
]);

/**
 * Normalizes a path from the client or query string to a safe operator return URL
 * (pathname only, no query). Defaults to dashboard.
 */
export function normalizeOperatorConnectReturnPath(
  path: string | null | undefined,
): string {
  if (!path || typeof path !== "string") return "/operator/dashboard";
  const pathname = path.trim().split("?")[0] ?? "";
  if (!pathname.startsWith("/")) return "/operator/dashboard";
  if (ALLOWED.has(pathname)) return pathname;
  return "/operator/dashboard";
}
