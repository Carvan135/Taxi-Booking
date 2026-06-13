"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { createClient } from "@/lib/supabase/client";
import { signUpSchema } from "@/lib/validations/auth";

const schema = z
  .object({
    password: signUpSchema.shape.password,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormInput = z.infer<typeof schema>;

const cardClass =
  "w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-300/40";

export function ResetPasswordForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setSubmitError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      const expired =
        error.message.toLowerCase().includes("session") ||
        error.message.toLowerCase().includes("expired");
      setSubmitError(
        expired
          ? "This reset link has expired. Please request a new one."
          : "Could not update your password. Please try again.",
      );
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?reset=success");
    router.refresh();
  });

  return (
    <div className={cardClass}>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-content">Set a new password</h1>
          <p className="mt-1 text-sm text-content/70">
            Choose a strong password for your AirportHub account.
          </p>
        </div>

        {submitError ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {submitError}
            {submitError.includes("expired") ? (
              <p className="mt-2">
                <Link href="/forgot-password" className="font-semibold underline">
                  Request a new reset link
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            label="New password"
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
            Update password
          </Button>
        </form>

        <p className="text-center text-sm text-content/70">
          <Link href="/login" className="font-semibold text-secondary hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
