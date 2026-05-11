"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Banknote,
  CalendarClock,
  Car,
  ChevronDown,
  Clock,
  CreditCard,
  HelpCircle,
  Info,
  Lock,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { createClient } from "@/lib/supabase/client";
import {
  operatorOnboardingFormSchema,
  type OperatorOnboardingClientValues,
} from "@/lib/validations/operator";
import type { z } from "zod";

const vehicleOptions = [
  "Sedan",
  "SUV",
  "Luxury",
  "Van",
  "Executive",
] as const;

const faqItems = [
  {
    q: "How long does approval take?",
    a: "We typically review applications within 2–3 business days. You’ll get an email once your documents are verified.",
  },
  {
    q: "When do I get paid?",
    a: "Payouts are processed after completed trips according to your payout schedule (shown in your dashboard once live).",
  },
  {
    q: "Do I need a special license?",
    a: "You must hold a valid driver and private-hire license for your region. Upload your documentation during onboarding for verification.",
  },
  {
    q: "Is there any joining fee?",
    a: "There is no joining fee for Milestone 1. Any future platform fees will be communicated clearly before they apply.",
  },
];

const trustItems = [
  { icon: Shield, label: "Secure Payments" },
  { icon: Sparkles, label: "Verified Platform" },
  { icon: Lock, label: "Data Protected" },
];

const whyCards = [
  {
    title: "Increase Earnings",
    body: "Reach riders actively booking through TaxiBook.",
    icon: Wallet,
  },
  {
    title: "Work Flexibly",
    body: "Choose when you drive and manage availability easily.",
    icon: Clock,
  },
  {
    title: "Fast Payouts",
    body: "Streamlined payouts once trips are completed.",
    icon: Banknote,
  },
  {
    title: "24/7 Support",
    body: "Help when you need it so you can stay on the road.",
    icon: HelpCircle,
  },
];

type FormInput = z.input<typeof operatorOnboardingFormSchema>;

export default function OperatorOnboardingPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeConnectError, setStripeConnectError] = useState<string | null>(
    null,
  );
  const [dragActive, setDragActive] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(operatorOnboardingFormSchema),
    defaultValues: {
      full_name: "",
      business_name: "",
      email: "",
      phone: "",
      vehicle_type: "Sedan",
      vehicle_registration: "",
      license_number: "",
      license_expiry: "",
      base_price: undefined,
    },
  });

  const termsAccepted = watch("terms_accepted") === true;

  useEffect(() => {
    let cancelled = false;
    async function loadExistingOperator() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: row } = await supabase
        .from("operators")
        .select("license_document_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        !cancelled &&
        row?.license_document_url &&
        typeof row.license_document_url === "string"
      ) {
        setSubmitSuccess(true);
      }
    }

    void loadExistingOperator();
    return () => {
      cancelled = true;
    };
  }, []);

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
    const data = values as OperatorOnboardingClientValues;
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSubmitError("You must be signed in to continue.");
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
          ? "Storage is not configured yet. Ask an admin to create the operator-licenses bucket (see migration)."
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

    const { error: operatorError } = await supabase.from("operators").upsert(
      {
        user_id: user.id,
        business_name: data.business_name,
        vehicle_type: data.vehicle_type,
        vehicle_registration: data.vehicle_registration,
        license_number: data.license_number,
        license_expiry: data.license_expiry,
        license_document_url: storagePath,
        base_price: data.base_price,
      },
      { onConflict: "user_id" },
    );

    if (operatorError) {
      setSubmitError(operatorError.message);
      return;
    }

    setSubmitSuccess(true);
  });

  async function handleStripeConnect() {
    setStripeConnectError(null);
    setStripeConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(
          body.error ?? "Could not start Stripe Connect onboarding.",
        );
      }
      if (!body.url) {
        throw new Error("No redirect URL returned from Stripe.");
      }
      window.location.assign(body.url);
    } catch (err) {
      setStripeConnectError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setStripeConnecting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-[#1a3052] to-slate-900 px-4 pb-28 pt-14 text-white sm:px-6 sm:pb-32 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.35),_transparent_55%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-200/90">
            Operator onboarding
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Become an Operator
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-blue-100/95 sm:text-lg">
            Join TaxiBook and get access to customers, fast payouts, and flexible
            work. Onboarding takes less than 3 minutes.
          </p>

          {/* Progress */}
          <div className="mx-auto mt-10 max-w-2xl">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-blue-100/90 sm:text-sm">
              <span className="text-white">Step 1 · Basic Details</span>
              <span>Step 2 · Verification</span>
              <span>Step 3 · Complete</span>
            </div>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full rounded-full bg-secondary shadow-[0_0_12px_rgba(37,99,235,0.8)] transition-all duration-500 ${
                  submitSuccess ? "w-2/3" : "w-1/3"
                }`}
              />
            </div>
            <p className="mt-2 text-left text-xs text-blue-200/80">
              {submitSuccess
                ? "Step 1 done — connect your bank with Stripe (Step 2) to receive payouts."
                : "Milestone 1: complete Step 1, then connect your bank via Stripe."}
            </p>
          </div>
        </div>
      </section>

      {/* Form card */}
      <div className="relative z-10 mx-auto -mt-24 max-w-3xl px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-300/50 sm:p-10">
          <h2 className="text-xl font-semibold text-content">
            Step 1 — Tell us about you
          </h2>
          <p className="mt-1 text-sm text-content/70">
            Your details help us verify your account and show riders accurate
            information.
          </p>

          {submitSuccess ? (
            <div
              className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900"
              role="status"
            >
              <p className="font-semibold">Profile saved</p>
              <p className="mt-1 text-sm">
                Continue to Step 2 to link your bank account with Stripe for
                payouts.
              </p>
            </div>
          ) : null}

          {submitError ? (
            <div
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {submitError}
            </div>
          ) : null}

          {!submitSuccess ? (
            <form
              onSubmit={onSubmit}
              className="mt-8 space-y-6"
              noValidate
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <FormField
                  label="Full name"
                  name="full_name"
                  register={register("full_name")}
                  error={errors.full_name}
                  placeholder="Jane Driver"
                  autoComplete="name"
                />
                <FormField
                  label="Business name"
                  name="business_name"
                  register={register("business_name")}
                  error={errors.business_name}
                  placeholder="Jane’s Private Hire"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
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
                  label="Phone"
                  name="phone"
                  register={register("phone")}
                  error={errors.phone}
                  type="tel"
                  placeholder="07xxx xxxxxx"
                  autoComplete="tel"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="w-full">
                  <label
                    htmlFor="vehicle_type"
                    className="mb-1.5 block text-sm font-medium text-content"
                  >
                    Vehicle type
                  </label>
                  <select
                    id="vehicle_type"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-content shadow-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    {...register("vehicle_type")}
                  >
                    {vehicleOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  {errors.vehicle_type?.message ? (
                    <p className="mt-1.5 text-sm text-red-600">
                      {errors.vehicle_type.message}
                    </p>
                  ) : null}
                </div>
                <FormField
                  label="Vehicle registration"
                  name="vehicle_registration"
                  register={register("vehicle_registration")}
                  error={errors.vehicle_registration}
                  placeholder="AB12 CDE"
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <FormField
                  label="License number"
                  name="license_number"
                  register={register("license_number")}
                  error={errors.license_number}
                  placeholder="License reference"
                />
                <div className="w-full">
                  <label
                    htmlFor="license_expiry"
                    className="mb-1.5 block text-sm font-medium text-content"
                  >
                    License expiry date
                  </label>
                  <input
                    id="license_expiry"
                    type="date"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-content shadow-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    {...register("license_expiry")}
                  />
                  {errors.license_expiry?.message ? (
                    <p className="mt-1.5 text-sm text-red-600">
                      {errors.license_expiry.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <label className="text-sm font-medium text-content">
                    Upload license document
                  </label>
                  <span
                    className="inline-flex cursor-help text-secondary"
                    title="We verify documents to keep the platform safe and compliant."
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
                      <Car className="mx-auto h-10 w-10 text-secondary/80" />
                      <p className="mt-3 text-sm font-medium text-content">
                        Drag & drop or browse
                      </p>
                      <p className="mt-1 text-xs text-content/65">
                        PDF, JPG, PNG · max 10MB
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

              <div>
                <label
                  htmlFor="base_price"
                  className="mb-1.5 block text-sm font-medium text-content"
                >
                  Base price (£)
                </label>
                <input
                  id="base_price"
                  type="number"
                  step="0.01"
                  min={1}
                  placeholder="e.g. 25"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-content shadow-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  {...register("base_price", { valueAsNumber: true })}
                />
                {errors.base_price?.message ? (
                  <p className="mt-1.5 text-sm text-red-600">
                    {String(errors.base_price.message)}
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
                    <span className="text-sm text-content/90">
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        className="font-semibold text-secondary underline-offset-2 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        terms and conditions
                      </Link>
                    </span>
                  </label>
                )}
              />
              {errors.terms_accepted?.message ? (
                <p className="text-sm text-red-600">
                  {errors.terms_accepted.message}
                </p>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full bg-secondary hover:opacity-95"
                loading={isSubmitting}
                disabled={!termsAccepted}
              >
                Start Onboarding
              </Button>
            </form>
          ) : null}
        </div>

        {submitSuccess ? (
          <div className="relative z-10 mx-auto mt-6 max-w-3xl px-4 sm:px-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-300/50 sm:p-10">
              <h2 className="text-xl font-semibold text-content">
                Step 2 — Connect your bank account
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-content/75">
                You&apos;ll be redirected to Stripe to securely connect your bank
                account. This is required to receive payouts.
              </p>
              {stripeConnectError ? (
                <div
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {stripeConnectError}
                </div>
              ) : null}
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-secondary hover:opacity-95"
                loading={stripeConnecting}
                onClick={() => void handleStripeConnect()}
              >
                <CreditCard className="h-5 w-5 shrink-0" aria-hidden />
                Connect with Stripe
              </Button>
              <p className="mt-6 text-center text-sm text-content/65">
                <Link
                  href="/operator/dashboard"
                  className="font-semibold text-secondary underline-offset-2 hover:underline"
                >
                  Skip for now — go to dashboard
                </Link>
              </p>
            </div>
          </div>
        ) : null}

        {/* Trust */}
        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-8 border-y border-slate-200 py-8 text-sm font-medium text-content/80">
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-secondary" aria-hidden />
              {label}
            </div>
          ))}
        </div>

        {/* Why */}
        <div className="mx-auto mt-14 max-w-5xl px-0">
          <h3 className="text-center text-2xl font-bold text-primary">
            Why Join TaxiBook?
          </h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whyCards.map(({ title, body, icon: Icon }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <Icon className="h-8 w-8 text-secondary" aria-hidden />
                <h4 className="mt-4 font-semibold text-content">{title}</h4>
                <p className="mt-2 text-sm text-content/75">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div className="flex items-center justify-center gap-2 text-center">
            <CalendarClock className="h-6 w-6 text-secondary" aria-hidden />
            <h3 className="text-2xl font-bold text-primary">
              Frequently asked questions
            </h3>
          </div>
          <div className="mt-8 space-y-3">
            {faqItems.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-xl border border-slate-200 bg-white shadow-sm open:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-content [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-secondary transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-content/80">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
