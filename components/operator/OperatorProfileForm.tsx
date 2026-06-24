"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Car,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Star,
} from "lucide-react";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { OperatorAvailabilityToggle } from "@/components/operator/OperatorAvailabilityToggle";
import { VehicleTypeMultiSelect } from "@/components/operator/VehicleTypeMultiSelect";
import { Button } from "@/components/ui/Button";
import { updateOperatorProfile } from "@/lib/actions/operatorProfile";
import {
  operatorProfileFormSchema,
  type OperatorProfileFormValues,
} from "@/lib/validations/operatorProfile";

const inputIcon =
  "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content/45";

const inputIconClass =
  "w-full rounded-lg border border-gray-300 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-content shadow-sm placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-blue-500/35";

const inputPlainClass =
  "w-full rounded-lg border border-gray-300 bg-slate-50 px-3 py-1.5 text-sm text-content shadow-sm placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-blue-500/35";

export type OperatorProfileFormProps = {
  initialForm: OperatorProfileFormValues;
  summary: {
    businessName: string;
    memberSinceYear: string;
    rating: number;
    totalReviews: number;
    totalBookings: number;
    completionRate: number;
    fleetVehicleCount: number;
  };
  availability?: {
    isPaused: boolean;
    pausedAt: string | null;
  };
};

export function OperatorProfileForm({
  initialForm,
  summary,
  availability,
}: OperatorProfileFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const fleetVehicleTypesErrorId = "profile-fleet_vehicle_types-error";
  const licenseNumberErrorId = "profile-license_number-error";
  const licenseExpiryErrorId = "profile-license_expiry-error";

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OperatorProfileFormValues>({
    resolver: zodResolver(operatorProfileFormSchema) as unknown as Resolver<OperatorProfileFormValues>,
    defaultValues: initialForm,
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setSavedOk(false);
    const result = await updateOperatorProfile(values);
    if (!result.success) {
      setSubmitError(result.error ?? "Could not save.");
      return;
    }
    setSavedOk(true);
    reset(values);
  });

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Summary */}
      <aside className="lg:col-span-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 text-secondary ring-4 ring-sky-50">
              <Car className="h-11 w-11" aria-hidden />
            </div>
            <h2 className="mt-4 text-xl font-bold text-primary">
              {summary.businessName}
            </h2>
            <p className="mt-1 text-sm text-content/65">
              Member since {summary.memberSinceYear}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-content">
              <Star
                className="h-5 w-5 fill-amber-400 text-amber-400"
                aria-hidden
              />
              <span>{summary.rating.toFixed(1)}</span>
              <span className="font-normal text-content/60">
                ({summary.totalReviews} reviews)
              </span>
            </div>
          </div>
          <hr className="my-6 border-slate-200" />
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-content/70">Total bookings</dt>
              <dd className="font-semibold tabular-nums text-primary">
                {summary.totalBookings.toLocaleString("en-GB")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-content/70">Completion rate</dt>
              <dd className="font-semibold tabular-nums text-primary">
                {summary.completionRate.toFixed(1)}%
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-content/70">Active vehicles</dt>
              <dd className="font-semibold tabular-nums text-primary">
                {summary.fleetVehicleCount}
              </dd>
            </div>
          </dl>
          {availability ? (
            <>
              <hr className="my-6 border-slate-200" />
              <OperatorAvailabilityToggle
                embedded
                isPaused={availability.isPaused}
                pausedAt={availability.pausedAt}
              />
            </>
          ) : null}
        </div>
      </aside>

      {/* Form */}
      <div className="lg:col-span-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          {savedOk ? (
            <div
              className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              role="status"
            >
              Profile saved successfully.
            </div>
          ) : null}
          {submitError ? (
            <div
              className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {submitError}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-10" noValidate>
            <section>
              <h3 className="text-sm font-semibold text-primary">
                Business information
              </h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="business_name"
                    className="mb-1 block text-xs font-medium text-content"
                  >
                    Business name
                  </label>
                  <div className="relative">
                    <Building2 className={inputIcon} aria-hidden />
                    <input
                      id="business_name"
                      className={inputIconClass}
                      {...register("business_name")}
                      autoComplete="organization"
                    />
                  </div>
                  {errors.business_name?.message ? (
                    <p className="mt-1.5 text-sm text-red-600">
                      {errors.business_name.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="vehicle_registration"
                    className="mb-1 block text-xs font-medium text-content"
                  >
                    Registration number
                  </label>
                  <input
                    id="vehicle_registration"
                    className={inputPlainClass}
                    {...register("vehicle_registration")}
                    autoComplete="off"
                  />
                  {errors.vehicle_registration?.message ? (
                    <p className="mt-1.5 text-sm text-red-600">
                      {String(errors.vehicle_registration.message)}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-xs font-medium text-content"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className={inputIcon} aria-hidden />
                    <input
                      id="email"
                      type="email"
                      className={inputIconClass}
                      {...register("email")}
                      autoComplete="email"
                    />
                  </div>
                  {errors.email?.message ? (
                    <p className="mt-1.5 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="phone"
                    className="mb-1 block text-xs font-medium text-content"
                  >
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className={inputIcon} aria-hidden />
                    <input
                      id="phone"
                      type="tel"
                      className={inputIconClass}
                      {...register("phone")}
                      autoComplete="tel"
                    />
                  </div>
                  {errors.phone?.message ? (
                    <p className="mt-1.5 text-sm text-red-600">
                      {errors.phone.message}
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="business_address"
                    className="mb-1 block text-xs font-medium text-content"
                  >
                    Business address
                  </label>
                  <div className="relative">
                    <MapPin className={inputIcon} aria-hidden />
                    <input
                      id="business_address"
                      className={inputIconClass}
                      {...register("business_address")}
                      placeholder="Street, city, postcode"
                      autoComplete="street-address"
                    />
                  </div>
                  {errors.business_address?.message ? (
                    <p className="mt-1.5 text-sm text-red-600">
                      {errors.business_address.message}
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="business_description"
                    className="mb-1 block text-xs font-medium text-content"
                  >
                    Business description
                  </label>
                  <textarea
                    id="business_description"
                    rows={3}
                    className={`${inputPlainClass} min-h-[5.5rem] resize-y py-2`}
                    {...register("business_description")}
                    placeholder="Tell customers about your service."
                  />
                  {errors.business_description?.message ? (
                    <p className="mt-1.5 text-sm text-red-600">
                      {errors.business_description.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-primary">
                Fleet &amp; license
              </h3>
              <div className="mt-5 space-y-4">
                <Controller
                  name="fleet_vehicle_types"
                  control={control}
                  render={({ field }) => (
                    <VehicleTypeMultiSelect
                      id="profile-fleet_vehicle_types"
                      value={field.value ?? []}
                      onChange={field.onChange}
                      error={errors.fleet_vehicle_types?.message}
                      errorId={fleetVehicleTypesErrorId}
                    />
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="fleet_vehicle_count"
                    className="mb-1 block text-xs font-medium text-content"
                  >
                    Number of vehicles
                  </label>
                  <input
                    id="fleet_vehicle_count"
                    type="number"
                    min={1}
                    max={999}
                    className={inputPlainClass}
                    {...register("fleet_vehicle_count", { valueAsNumber: true })}
                  />
                  {errors.fleet_vehicle_count?.message ? (
                    <p className="mt-1.5 text-sm text-red-600">
                      {String(errors.fleet_vehicle_count.message)}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label
                    htmlFor="license_number"
                    className="mb-1 block text-xs font-medium text-content"
                  >
                    License number
                  </label>
                  <div className="relative">
                    <IdCard className={inputIcon} aria-hidden />
                    <input
                      id="license_number"
                      className={inputIconClass}
                      {...register("license_number")}
                      placeholder="License reference"
                      autoComplete="off"
                    />
                  </div>
                  {errors.license_number?.message ? (
                    <p
                      id={licenseNumberErrorId}
                      className="mt-1.5 text-sm text-red-600"
                      role="alert"
                    >
                      {errors.license_number.message}
                    </p>
                  ) : null}
                </div>
                <div className="w-full">
                  <label
                    htmlFor="license_expiry"
                    className="mb-1 block text-xs font-medium text-content"
                  >
                    License expiry date
                  </label>
                  <input
                    id="license_expiry"
                    type="date"
                    className={inputPlainClass}
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
              </div>
            </section>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmitting}
                className="min-w-[120px] bg-secondary hover:opacity-95"
              >
                Save changes
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-w-[100px] border border-slate-200 bg-white text-content text-sm shadow-sm hover:bg-slate-50"
                disabled={!isDirty || isSubmitting}
                onClick={() => {
                  setSubmitError(null);
                  setSavedOk(false);
                  reset(initialForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
