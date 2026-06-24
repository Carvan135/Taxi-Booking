import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getDashboardPathForRole,
  getLoginPathForRole,
} from "@/lib/auth/routes";
import { getSupabasePublicEnv } from "@/lib/env/supabase-public";
import type { UserRole } from "@/types";

/**
 * Customer-only routes (sign-in required).
 * `/book` is public — see `(public)/book`.
 * `/dashboard` redirects to `/bookings` for backwards compatibility.
 */
const CUSTOMER_ROUTE_PREFIXES = ["/dashboard"] as const;

const CUSTOMER_BOOKINGS_LIST_PATH = "/bookings";

function matchesProtectedPrefix(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const publicRoots = [
    "/book",
    "/operators",
    "/payment",
    "/confirmation",
    "/complete-payment",
    "/bookings/lookup",
    "/contact",
    "/faq",
    "/privacy",
    "/terms",
    "/cookies",
    "/reset-password",
    "/auth/reset-password",
    "/auth/callback",
  ];
  for (const root of publicRoots) {
    if (pathname === root || pathname.startsWith(`${root}/`)) return true;
  }
  return false;
}

function isAuthPage(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password")
  );
}

function requiredRoleForPath(pathname: string): UserRole | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/operator")) return "operator";
  if (
    CUSTOMER_ROUTE_PREFIXES.some((base) =>
      matchesProtectedPrefix(pathname, base),
    )
  ) {
    return "customer";
  }
  return null;
}

function mergeCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
}

/**
 * Refreshes the Supabase session from cookies and enforces route-level role rules.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const supabaseEnv = getSupabasePublicEnv();
  if (!supabaseEnv) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseEnv.url,
    supabaseEnv.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: UserRole | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role as UserRole | undefined;
  }

  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  if (isAuthPage(pathname)) {
    if (user && role) {
      const target = NextResponse.redirect(
        new URL(getDashboardPathForRole(role), request.url),
      );
      mergeCookies(supabaseResponse, target);
      return target;
    }
    return supabaseResponse;
  }

  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  if (pathname === CUSTOMER_BOOKINGS_LIST_PATH) {
    if (!user) {
      const lookupUrl = new URL("/bookings/lookup", request.url);
      const res = NextResponse.redirect(lookupUrl);
      mergeCookies(supabaseResponse, res);
      return res;
    }
    if (!role) {
      const loginUrl = new URL(getLoginPathForRole("customer"), request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      mergeCookies(supabaseResponse, res);
      return res;
    }
    if (role !== "customer") {
      const dest = new URL(getDashboardPathForRole(role), request.url);
      const res = NextResponse.redirect(dest);
      mergeCookies(supabaseResponse, res);
      return res;
    }
    return supabaseResponse;
  }

  const neededRole = requiredRoleForPath(pathname);

  if (!neededRole) {
    return supabaseResponse;
  }

  if (!user) {
    const loginUrl = new URL(getLoginPathForRole(neededRole), request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    const res = NextResponse.redirect(loginUrl);
    mergeCookies(supabaseResponse, res);
    return res;
  }

  if (!role) {
    const loginUrl = new URL(getLoginPathForRole(neededRole), request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    const res = NextResponse.redirect(loginUrl);
    mergeCookies(supabaseResponse, res);
    return res;
  }

  if (role !== neededRole) {
    const dest = new URL(getDashboardPathForRole(role), request.url);
    const res = NextResponse.redirect(dest);
    mergeCookies(supabaseResponse, res);
    return res;
  }

  return supabaseResponse;
}
