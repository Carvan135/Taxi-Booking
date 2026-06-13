"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { changePassword } from "@/lib/actions/changePassword";
import {
  changePasswordSchema,
  type ChangePasswordFormInput,
} from "@/lib/validations/changePassword";

type ChangePasswordFormProps = {
  className?: string;
  embedded?: boolean;
};

export function ChangePasswordForm({
  className = "",
  embedded = false,
}: ChangePasswordFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSavedOk(false);

    const result = await changePassword(values);
    if (!result.success) {
      setSubmitError(result.error ?? "Could not update password.");
      return;
    }

    setSavedOk(true);
    reset({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
  });

  const shell = embedded
    ? ""
    : "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8";

  return (
    <section className={`${shell} ${className}`.trim()}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E3A5F]/10 text-[#1E3A5F]">
          <KeyRound className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-primary">Change password</h2>
          <p className="mt-1 text-sm text-content/70">
            Update your password. You&apos;ll stay signed in on this device.
          </p>
        </div>
      </div>

      {savedOk ? (
        <div
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          Password updated successfully.
        </div>
      ) : null}

      {submitError ? (
        <div
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {submitError}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <FormField
          label="Current password"
          name="current_password"
          register={register("current_password")}
          error={errors.current_password}
          type="password"
          passwordToggle
          autoComplete="current-password"
        />

        <FormField
          label="New password"
          name="new_password"
          register={register("new_password")}
          error={errors.new_password}
          type="password"
          passwordToggle
          autoComplete="new-password"
        />

        <FormField
          label="Confirm new password"
          name="confirm_password"
          register={register("confirm_password")}
          error={errors.confirm_password}
          type="password"
          passwordToggle
          autoComplete="new-password"
        />

        <p className="text-xs text-content/60">
          At least 8 characters, including one uppercase letter and one number.
        </p>

        <Button type="submit" variant="primary" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </section>
  );
}
