"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { signInSchema } from "@/lib/validations/auth";

const schema = z.object({
  email: signInSchema.shape.email,
});

type FormInput = z.infer<typeof schema>;

const cardClass =
  "w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-300/40";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await fetch("/api/auth/send-reset-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      /* Always show the same success message — do not reveal account status */
    }
    setSubmitted(true);
  });

  return (
    <div className={cardClass}>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-content">Reset your password</h1>
          <p className="mt-1 text-sm text-content/70">
            Enter your email and we&apos;ll send you a link to choose a new password.
          </p>
        </div>

        {submitted ? (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            If an account exists for this email, you&apos;ll receive a reset link
            shortly.
          </div>
        ) : (
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={isSubmitting}
            >
              Send Reset Link
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-content/70">
          <Link href="/login" className="font-semibold text-secondary hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
