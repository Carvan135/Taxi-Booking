import type { UserRole } from "@/types";

export const PORTAL_LABELS: Record<UserRole, string> = {
  admin: "admin portal",
  operator: "operator portal",
  customer: "customer account",
};

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

export type AccessDeniedContext = {
  requiredRole: UserRole;
  currentRole?: UserRole;
};

export function buildAccessDeniedPath({
  requiredRole,
  currentRole,
}: AccessDeniedContext): string {
  const params = new URLSearchParams({ required: requiredRole });
  if (currentRole) {
    params.set("as", currentRole);
  }
  return `/access-denied?${params.toString()}`;
}

/**
 * Role required to sign in via a portal-specific auth path, or null when the
 * path is not tied to a single portal (e.g. forgot-password).
 */
export function getPortalRoleForAuthPath(pathname: string): UserRole | null {
  if (pathname === "/login/admin" || pathname.startsWith("/login/admin/")) {
    return "admin";
  }
  if (pathname === "/login/operator" || pathname.startsWith("/login/operator/")) {
    return "operator";
  }
  if (pathname === "/login") {
    return "customer";
  }
  if (pathname === "/signup/operator" || pathname.startsWith("/signup/operator/")) {
    return "operator";
  }
  if (pathname === "/signup") {
    return "customer";
  }
  return null;
}
