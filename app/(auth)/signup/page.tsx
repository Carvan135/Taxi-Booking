"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { signUp } from "@/lib/auth/actions";
import { safeInternalRedirectPath } from "@/lib/auth/routes";
import {
  customerSignUpFormSchema,
  type CustomerSignUpFormInput,
} from "@/lib/validations";

const authCardClass =
  "w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-300/40";

function CustomerSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = safeInternalRedirectPath(searchParams.get("redirect"));
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerSignUpFormInput>({
    resolver: zodResolver(customerSignUpFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    setSubmitError(null);
    const result = await signUp({
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      phone: undefined,
      role: "customer",
    });

    if (!result.success) {
      setSubmitError(result.error ?? "Could not create your account.");
      return;
    }

    const defaultAfterLogin = "/bookings";
    const loginUrl = redirectParam
      ? `/login?registered=true&redirect=${encodeURIComponent(redirectParam)}`
      : `/login?registered=true&redirect=${encodeURIComponent(defaultAfterLogin)}`;
    router.push(loginUrl);
  });

  return (
    <div className={authCardClass}>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-content">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-content/70">
            Book rides in seconds — just name, email, and password.
          </p>
        </div>

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
            label="Full name"
            name="full_name"
            register={register("full_name")}
            error={errors.full_name}
            placeholder="Jane Doe"
            autoComplete="name"
          />

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
            autoComplete="new-password"
          />

          <FormField
            label="Confirm password"
            name="confirmPassword"
            register={register("confirmPassword")}
            error={errors.confirmPassword}
            type="password"
            passwordToggle
            placeholder="••••••••"
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isSubmitting}
          >
            Continue
          </Button>
        </form>

        <p className="text-center text-sm text-content/70">
          Already have an account?{" "}
          <Link
            href={
              redirectParam
                ? `/login?redirect=${encodeURIComponent(redirectParam)}`
                : "/login"
            }
            className="font-semibold text-secondary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className={authCardClass}>
          <div className="py-8 text-center text-sm text-content/60">
            Loading…
          </div>
        </div>
      }
    >
      <CustomerSignupForm />
    </Suspense>
  );
}
