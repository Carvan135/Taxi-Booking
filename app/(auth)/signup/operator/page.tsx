"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SITE_NAME } from "@/lib/site/contact";
import { ArrowLeft, Car, Info, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import type { DefaultValues } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { VehicleTypeMultiSelect } from "@/components/operator/VehicleTypeMultiSelect";
import { signUp } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { operatorSignUpFormSchema } from "@/lib/validations";
import type { z } from "zod";

type FormInput = z.infer<typeof operatorSignUpFormSchema>;

const cardClass =
  "w-full max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-300/40 sm:p-10";

function OperatorSignupBanner() {
  return (
    <section
      className="mb-0 bg-[#0a1120] py-12 text-center sm:py-14"
      style={{
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
      }}
      aria-labelledby="operator-signup-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-4 pb-2 pt-6 sm:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-sky-200 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1120]"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back to home
        </Link>
      </div>
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4">
        <Car
          className="h-10 w-10 text-white"
          strokeWidth={1.5}
          aria-hidden
        />
        <h1
          id="operator-signup-heading"
          className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          Become an Operator
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
          Join {SITE_NAME} and get access to customers, fast payouts, and flexible
          work.
        </p>
        <p className="mt-2 text-sm font-medium text-sky-400">
          Onboarding takes less than 3 minutes.
        </p>
      </div>
    </section>
  );
}

export default function OperatorSignupPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(operatorSignUpFormSchema) as unknown as Resolver<FormInput>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      full_name: "",
      business_name: "",
      email: "",
      phone: "",
      password: "",
      fleet_vehicle_types: ["Saloon"],
      vehicle_registration: "",
      license_number: "",
      license_expiry: "",
      base_price: undefined,
      terms_accepted: false,
    } as unknown as DefaultValues<FormInput>,
  });

  const termsAccepted = watch("terms_accepted") === true;

  const fleetVehicleTypesErrorId = "fleet_vehicle_types-error";
  const licenseExpiryErrorId = "license_expiry-error";
  const basePriceErrorId = "base_price-error";

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) setValue("license_document", file, { shouldValidate: true });
    },
    [setValue],
  );

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const parsed = operatorSignUpFormSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitError("Please check the highlighted fields and try again.");
      return;
    }
    const data = parsed.data;

    const account = await signUp({
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      phone: data.phone,
      role: "operator",
      operatorApplication: {
        business_name: data.business_name,
        fleet_vehicle_types: data.fleet_vehicle_types,
        vehicle_registration: data.vehicle_registration,
        license_number: data.license_number,
        license_expiry: data.license_expiry,
        base_price: data.base_price,
      },
    });

    if (!account.success) {
      setSubmitError(account.error ?? "Could not create your account.");
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSubmitError(
        "Account created — please check your email to confirm, then sign in to finish onboarding.",
      );
      return;
    }

    const safeName = data.license_document.name.replace(/[^\w.\-]/g, "_");
    const storagePath = `${user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("operator-licenses")
      .upload(storagePath, data.license_document, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setSubmitError(
        uploadError.message.includes("Bucket not found")
          ? "Storage is not configured yet. Ask an admin to create the operator-licenses bucket."
          : uploadError.message,
      );
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
      })
      .eq("id", user.id);

    if (profileError) {
      setSubmitError(profileError.message);
      return;
    }

    const { data: operatorRow, error: operatorError } = await supabase
      .from("operators")
      .update({ license_document_url: storagePath })
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (operatorError || !operatorRow) {
      setSubmitError(
        operatorError?.message ??
          "Could not save your application. Please try signing in and completing your profile.",
      );
      return;
    }

    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
      const url = origin
        ? `${origin}/api/stripe/connect/create-account`
        : "/api/stripe/connect/create-account";
      await fetch(url, { method: "POST", credentials: "include" });
    } catch (err) {
      console.error("Silent Stripe account creation failed:", err);
    }

    router.replace("/operator/dashboard");
    router.refresh();
  });

  return (
    <>
      <OperatorSignupBanner />

      <div className="flex w-full flex-col items-center px-4 pb-12 pt-10">
        <Link
          href="/"
          className="mb-10 text-2xl font-bold tracking-tight text-primary"
        >
          {SITE_NAME}
        </Link>

        <div className="w-full min-w-0 max-w-3xl">
          <div className={cardClass}>
      <div className="text-center">
        <h2 className="text-xl font-semibold tracking-tight text-content sm:text-2xl">
          Your application
        </h2>
        <p className="mt-2 text-sm text-content/70">
          Complete the form below — fields marked * are required.
        </p>
      </div>

      {submitError ? (
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {submitError}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <FormField
            label="Full name *"
            name="full_name"
            register={register("full_name")}
            error={errors.full_name}
            placeholder="John Doe"
            autoComplete="name"
          />
          <FormField
            label="Email *"
            name="email"
            register={register("email")}
            error={errors.email}
            type="email"
            placeholder="john@taxicompany.com"
            autoComplete="email"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <FormField
            label="Phone number *"
            name="phone"
            register={register("phone", {
              onChange: (e) => {
                const input = e.target as HTMLInputElement;
                input.value = input.value.replace(/[^0-9+\s()-]/g, "");
              },
            })}
            error={errors.phone}
            type="tel"
            placeholder="+44 7700 900000"
            autoComplete="tel"
            inputMode="tel"
          />
          <FormField
            label="Business name *"
            name="business_name"
            register={register("business_name")}
            error={errors.business_name}
            placeholder="Your Taxi Company Ltd"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <FormField
            label="Password *"
            name="password"
            register={register("password")}
            error={errors.password}
            type="password"
            passwordToggle
            placeholder="Create a password"
            autoComplete="new-password"
          />
          <div>
            <label
              htmlFor="base_price"
              className="mb-1.5 block text-sm font-medium text-content"
            >
              Base price (£) *
            </label>
            <input
              id="base_price"
              type="number"
              step="0.01"
              min={1}
              placeholder="5.00"
              className="w-full rounded-xl border border-gray-300 bg-slate-50 px-4 py-2.5 text-content shadow-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              {...register("base_price", { valueAsNumber: true })}
              aria-invalid={errors.base_price ? "true" : "false"}
              aria-describedby={errors.base_price ? basePriceErrorId : undefined}
            />
            <p className="mt-1.5 text-xs text-content/60">
              Starting fare for your service
            </p>
            {errors.base_price?.message ? (
              <p
                id={basePriceErrorId}
                className="mt-1.5 text-sm text-red-600"
                role="alert"
              >
                {String(errors.base_price.message)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div className="md:col-span-2">
            <Controller
              name="fleet_vehicle_types"
              control={control}
              render={({ field }) => (
                <VehicleTypeMultiSelect
                  value={field.value ?? []}
                  onChange={field.onChange}
                  error={
                    errors.fleet_vehicle_types?.message
                      ? String(errors.fleet_vehicle_types.message)
                      : undefined
                  }
                  errorId={fleetVehicleTypesErrorId}
                />
              )}
            />
          </div>
          <FormField
            label="Vehicle registration number *"
            name="vehicle_registration"
            register={register("vehicle_registration")}
            error={errors.vehicle_registration}
            placeholder="AB12 CDE"
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <FormField
            label="License number *"
            name="license_number"
            register={register("license_number")}
            error={errors.license_number}
            placeholder="ABC123456"
          />
          <div className="w-full">
            <label
              htmlFor="license_expiry"
              className="mb-1.5 block text-sm font-medium text-content"
            >
              License expiry date *
            </label>
            <input
              id="license_expiry"
              type="date"
              className="w-full rounded-xl border border-gray-300 bg-slate-50 px-4 py-2.5 text-content shadow-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              {...register("license_expiry")}
              aria-invalid={errors.license_expiry ? "true" : "false"}
              aria-describedby={
                errors.license_expiry ? licenseExpiryErrorId : undefined
              }
            />
            {errors.license_expiry?.message ? (
              <p
                id={licenseExpiryErrorId}
                className="mt-1.5 text-sm text-red-600"
                role="alert"
              >
                {errors.license_expiry.message}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <label className="text-sm font-medium text-content">
              Upload license document *
            </label>
            <span
              className="inline-flex cursor-help text-secondary"
              title="PDF or image up to 10MB. Used to verify your operator profile."
            >
              <Info className="h-4 w-4" aria-hidden />
            </span>
          </div>
          <Controller
            name="license_document"
            control={control}
            render={({ field: { onChange, onBlur, name, ref, value } }) => (
              <div
                role="presentation"
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className={`rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
                  dragActive
                    ? "border-secondary bg-blue-50/80"
                    : "border-gray-300 bg-slate-50/80 hover:border-secondary/60"
                }`}
              >
                <Upload className="mx-auto h-10 w-10 text-secondary/80" aria-hidden />
                <p className="mt-3 text-sm font-medium text-content">
                  Click to upload or drag and drop
                </p>
                <p className="mt-1 text-xs text-content/65">
                  PDF, JPG, PNG (max 10MB)
                </p>
                <input
                  ref={ref}
                  name={name}
                  onBlur={onBlur}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf"
                  className="mt-4 block w-full cursor-pointer text-sm text-content/80 file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-secondary-foreground"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onChange(file);
                  }}
                />
                {value instanceof File ? (
                  <p className="mt-3 truncate text-xs text-content/70">
                    Selected: {value.name}
                  </p>
                ) : null}
              </div>
            )}
          />
          {errors.license_document?.message ? (
            <p className="mt-1.5 text-sm text-red-600">
              {String(errors.license_document.message)}
            </p>
          ) : null}
        </div>

        <Controller
          name="terms_accepted"
          control={control}
          render={({ field }) => (
            <label className="flex cursor-pointer items-start gap-3 pt-1">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                checked={field.value === true}
                onChange={(e) =>
                  field.onChange(e.target.checked ? true : false)
                }
                onBlur={field.onBlur}
                ref={field.ref}
              />
              <span className="text-sm leading-relaxed text-content/90">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-secondary underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  terms and conditions
                </Link>
                {" "}and understand that a{" "}
                <strong className="font-semibold text-content">
                  15% platform commission
                </strong>{" "}
                applies to all bookings.
              </span>
            </label>
          )}
        />
        {errors.terms_accepted?.message ? (
          <p className="text-sm text-red-600">{errors.terms_accepted.message}</p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full bg-secondary hover:opacity-95"
          loading={isSubmitting}
          disabled={!termsAccepted}
        >
          Submit application
        </Button>

        <p className="text-center text-sm text-content/70">
          Already have an account?{" "}
          <Link
            href="/login/operator"
            className="font-semibold text-secondary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
          </div>
        </div>
      </div>
    </>
  );
}
