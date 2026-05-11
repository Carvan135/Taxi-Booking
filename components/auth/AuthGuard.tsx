"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useProfile } from "@/hooks/queries/useProfile";
import { getDashboardPathForRole } from "@/lib/auth/routes";
import type { UserRole } from "@/types";

type AuthGuardProps = {
  allowedRoles: UserRole | UserRole[];
  children: React.ReactNode;
};

export function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const router = useRouter();
  const { data: profile, isPending, isError } = useProfile();

  const allowed = useMemo(
    () => (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]),
    [allowedRoles],
  );

  useEffect(() => {
    if (isPending) return;

    if (isError || !profile) {
      const next =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/bookings";
      router.replace(
        `/login?redirect=${encodeURIComponent(next)}`,
      );
      return;
    }

    if (!allowed.includes(profile.role)) {
      router.replace(getDashboardPathForRole(profile.role));
    }
  }, [allowed, isError, isPending, profile, router]);

  if (isPending) {
    return <AuthGuardSkeleton />;
  }

  if (isError || !profile || !allowed.includes(profile.role)) {
    return <AuthGuardSkeleton />;
  }

  return <>{children}</>;
}

function AuthGuardSkeleton() {
  return (
    <div
      className="animate-pulse space-y-4 p-6"
      aria-busy="true"
      aria-label="Checking access"
    >
      <div className="h-8 w-1/3 rounded-md bg-gray-200" />
      <div className="h-4 w-full rounded-md bg-gray-100" />
      <div className="h-4 w-2/3 rounded-md bg-gray-100" />
    </div>
  );
}
