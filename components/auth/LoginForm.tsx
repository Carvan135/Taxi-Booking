"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { signIn } from "@/lib/auth/actions";
import { safeInternalRedirectPath } from "@/lib/auth/routes";
import {
  claimGuestBookings,
} from "@/lib/guest/claim-bookings-client";
import { signInSchema, type SignInFormData } from "@/lib/validations";
import type { UserRole } from "@/types";

const cardClass =
  "w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-300/40";

export type LoginFormVariant = "rider" | "operator";

type LoginFormProps = {
  variant?: LoginFormVariant;
  allowedRoles?: Array<"customer" | "operator" | "admin">;
  /** Render inside a modal or other container without card chrome. */
  embedded?: boolean;
  /** Override redirect from URL search params (`null` = no redirect). */
  redirectTo?: string | null;
  /** Sign-up link redirect when embedded (e.g. return to checkout). */
  signupRedirectTo?: string;
  /** Called on successful sign-in instead of navigating away. */
  onSuccess?: (result: { role: UserRole }) => void | Promise<void>;
};

export function LoginForm({
  variant = "rider",
  allowedRoles,
  embedded = false,
  redirectTo,
  signupRedirectTo,
  onSuccess,
}: LoginFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";
  const passwordReset = searchParams.get("reset") === "success";
  const redirectParam =
    redirectTo !== undefined
      ? redirectTo
      : safeInternalRedirectPath(searchParams.get("redirect"));
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setSubmitError(null);
    const result = await signIn(data, { allowedRoles });

    if (!result.success) {
      setSubmitError(result.error ?? "Sign in failed.");
      return;
    }

    if (variant === "rider" && result.role === "customer") {
      await claimGuestBookings(queryClient);
    }

    if (onSuccess) {
      await onSuccess({ role: result.role! });
      return;
    }

    if (redirectParam) {
      router.push(redirectParam);
      router.refresh();
      return;
    }

    const role = result.role;
    if (role === "operator") {
      router.push("/operator/dashboard");
      router.refresh();
      return;
    }
    if (role === "admin") {
      router.push("/admin/dashboard");
      router.refresh();
      return;
    }
    router.push("/bookings");
    router.refresh();
  });

  const riderSignupHref = signupRedirectTo
    ? `/signup?redirect=${encodeURIComponent(signupRedirectTo)}`
    : redirectParam
      ? `/signup?redirect=${encodeURIComponent(redirectParam)}`
      : "/signup";
  const operatorSignupHref = redirectParam
    ? `/signup/operator?redirect=${encodeURIComponent(redirectParam)}`
    : "/signup/operator";

  const heading =
    variant === "operator"
      ? { title: "Operator sign in", subtitle: "Access your operator dashboard" }
      : { title: "Welcome back", subtitle: "Sign in to your AirportHub account" };

  const wrapperClass = embedded ? "space-y-4" : cardClass;

  return (
    <div className={wrapperClass}>
      <div className="space-y-6">
        {embedded ? (
          <p className="text-center text-sm text-content/70">
            Sign in to pre-fill your details and save this booking to My
            bookings after payment.
          </p>
        ) : (
          <div className="text-center">
            <h1 className="text-xl font-semibold text-content">{heading.title}</h1>
            <p className="mt-1 text-sm text-content/70">{heading.subtitle}</p>
          </div>
        )}

        {registered ? (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900"
            role="status"
          >
            Registration successful. Sign in below — guest bookings with this
            email will link to your account automatically.
          </div>
        ) : null}

        {passwordReset ? (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900"
            role="status"
          >
            Password updated. Sign in with your new password.
          </div>
        ) : null}

        {submitError ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {submitError}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            label="Email"
            name="email"
            register={register("email")}
            error={errors.email}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />

          <FormField
            label="Password"
            name="password"
            register={register("password")}
            error={errors.password}
            type="password"
            passwordToggle
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-secondary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isSubmitting}
          >
            Sign in
          </Button>
        </form>

        {variant === "rider" ? (
          <p className="text-center text-sm text-content/70">
            Don&apos;t have an account?{" "}
            <Link
              href={riderSignupHref}
              className="font-semibold text-secondary hover:underline"
            >
              Sign up
            </Link>
          </p>
        ) : (
          <p className="text-center text-sm text-content/70">
            New operator?{" "}
            <Link
              href={operatorSignupHref}
              className="font-semibold text-secondary hover:underline"
            >
              Create operator account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export function LoginFormCardFallback() {
  return (
    <div className="py-6 text-center text-sm text-content/60">Loading…</div>
  );
}
