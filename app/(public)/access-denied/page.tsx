import Link from "next/link";
import {
  getDashboardPathForRole,
  PORTAL_LABELS,
} from "@/lib/auth/routes";
import type { UserRole } from "@/types";

function parseRole(value: string | undefined): UserRole | null {
  if (value === "admin" || value === "operator" || value === "customer") {
    return value;
  }
  return null;
}

type AccessDeniedPageProps = {
  searchParams: { required?: string; as?: string };
};

export default function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const requiredRole = parseRole(searchParams.required) ?? "admin";
  const currentRole = parseRole(searchParams.as);

  const description = currentRole
    ? `You are signed in with a ${PORTAL_LABELS[currentRole]}, which does not have access to the ${PORTAL_LABELS[requiredRole]}.`
    : `You do not have access to the ${PORTAL_LABELS[requiredRole]}.`;

  const backHref = currentRole ? getDashboardPathForRole(currentRole) : "/";
  const backLabel = currentRole
    ? `Back to ${PORTAL_LABELS[currentRole]}`
    : "Back to home";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
        Access denied
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-content">
        Wrong portal
      </h1>
      <p className="mt-4 text-base leading-relaxed text-content/70">
        {description}
      </p>
      <p className="mt-2 text-sm text-content/60">
        Sign out and use the correct portal login if you need a different
        account.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
        >
          {backLabel}
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-content transition hover:bg-slate-50"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
