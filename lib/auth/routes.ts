import type { UserRole } from "@/types";

export function getDashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "customer":
      return "/bookings";
    case "operator":
      return "/operator/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/bookings";
  }
}

export function getLoginPathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/login/admin";
    case "operator":
      return "/login/operator";
    case "customer":
    default:
      return "/login";
  }
}

/**
 * Returns a same-origin path safe for open redirects after login, or null.
 */
export function safeInternalRedirectPath(
  path: string | null | undefined,
): string | null {
  if (path == null || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/login") || trimmed.startsWith("/signup"))
    return null;
  return trimmed; 
}
