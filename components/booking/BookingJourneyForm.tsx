"use client";

import {
  ArrowRight,
  Calendar,
  Car,
  ChevronDown,
  Clock,
  Luggage,
  MapPin,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";
import { AddressAutocompleteInput } from "@/components/booking/AddressAutocompleteInput";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { calculateTripDistance } from "@/lib/booking/route-calculator";
import type { BookingPlace } from "@/lib/booking/booking-session-types";
import { geocode, type GeoPlace } from "@/lib/maps/geoapify";
import { MAX_BOOKING_LUGGAGE } from "@/lib/booking/luggage-display";
import { SERVICE_TYPES } from "@/lib/validations/enums";
import {
  BOOK_TRIP_INPUT_CLASS,
  BOOK_TRIP_PRIMARY_ACTION_CLASS,
} from "@/components/booking/booking-form-styles";
import {
  loadTaxibookBooking,
  saveTaxibookBooking,
  type TaxibookBookingSession,
} from "@/lib/booking/session";
import {
  oneWayBookingSchema,
  returnBookingSchema,
  type ReturnBookingFormInput,
} from "@/lib/validations/booking";
import type { z } from "zod";

type BookingFormValues = ReturnBookingFormInput;

type BookingJourneyFormProps = {
  /** `hero` — home card only; `page` — full step-1 booking page with stepper */
  variant?: "hero" | "page";
};

const defaultValues: BookingFormValues = {
  pickup_address: "",
  dropoff_address: "",
  pickup_date: "",
  pickup_time: "",
  passengers: 1,
  service_type: "standard",
  luggage: 0,
  notes: "",
  return_date: "",
  return_time: "",
};

const CARD_CLASS =
  "rounded-2xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-7 lg:p-8";

const SERVICE_TYPE_LABELS: Record<(typeof SERVICE_TYPES)[number], string> = {
  standard: "Standard",
  executive: "Executive",
  van: "Van",
  suv: "SUV",
};

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function applyZodErrors(
  issues: z.ZodIssue[],
  setError: (name: FieldPath<BookingFormValues>, error: { message: string }) => void,
) {
  for (const issue of issues) {
    const path = issue.path[0];
    if (typeof path === "string") {
      setError(path as FieldPath<BookingFormValues>, {
        message: issue.message,
      });
    }
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-sm text-red-600" role="alert">
      {message}
    </p>
  );
}

export function BookingJourneyForm({ variant = "page" }: BookingJourneyFormProps) {
  const router = useRouter();
  const isHero = variant === "hero";
  const idPrefix = isHero ? "hero" : "book";

  const [bookingType, setBookingType] = useState<"one_way" | "return">("one_way");
  const [notesOpen, setNotesOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pickupPlace, setPickupPlace] = useState<GeoPlace | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<GeoPlace | null>(null);
  const [isProceeding, setIsProceeding] = useState(false);
  const minDate = useMemo(() => todayIsoDate(), []);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    defaultValues,
    mode: "onTouched",
  });

  const pickupAddress = watch("pickup_address");
  const dropoffAddress = watch("dropoff_address");

  useEffect(() => {
    const stored = loadTaxibookBooking();
    if (!stored) return;

    setBookingType(stored.booking_type);
    setValue("pickup_address", stored.pickup_address);
    setValue("dropoff_address", stored.dropoff_address);
    setValue("pickup_date", stored.pickup_date);
    setValue("pickup_time", stored.pickup_time);
    setValue("passengers", stored.passengers);
    setValue("service_type", stored.service_type);
    setValue("luggage", stored.luggage ?? 0);
    setValue("notes", stored.notes ?? "");
    if (stored.return_date) setValue("return_date", stored.return_date);
    if (stored.return_time) setValue("return_time", stored.return_time);
    if (stored.pickup) setPickupPlace(stored.pickup);
    if (stored.dropoff) setDropoffPlace(stored.dropoff);
  }, [setValue]);

  const pickupDate = watch("pickup_date");

  const setTripType = (type: "one_way" | "return") => {
    setBookingType(type);
    clearErrors(["return_date", "return_time"]);
  };

  const resolvePlace = async (
    place: GeoPlace | null,
    address: string,
    field: "pickup_address" | "dropoff_address",
  ): Promise<BookingPlace | null> => {
    if (place) return place;
    const geocoded = await geocode(address);
    if (!geocoded) {
      setError(field, {
        message: "Select a valid address from the suggestions",
      });
      return null;
    }
    return geocoded;
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const parsed =
      bookingType === "one_way"
        ? oneWayBookingSchema.safeParse(values)
        : returnBookingSchema.safeParse(values);

    if (!parsed.success) {
      clearErrors();
      applyZodErrors(parsed.error.issues, setError);
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setIsProceeding(true);

    try {
      const data = parsed.data;
      const pickup = await resolvePlace(
        pickupPlace,
        data.pickup_address,
        "pickup_address",
      );
      const dropoff = await resolvePlace(
        dropoffPlace,
        data.dropoff_address,
        "dropoff_address",
      );

      if (!pickup || !dropoff) {
        setFormError("Please select valid pickup and dropoff locations.");
        return;
      }

      let route: TaxibookBookingSession["route"];
      try {
        route = await calculateTripDistance(pickup, dropoff);
      } catch {
        route = undefined;
      }

      const session: TaxibookBookingSession = {
        booking_type: bookingType,
        pickup_address: pickup.label,
        dropoff_address: dropoff.label,
        pickup,
        dropoff,
        route,
        pickup_date: data.pickup_date,
        pickup_time: data.pickup_time,
        passengers: data.passengers,
        service_type: data.service_type,
        luggage: data.luggage,
        notes: data.notes?.trim() ? data.notes.trim() : undefined,
      };

      if (bookingType === "return") {
        const returnData = data as z.infer<typeof returnBookingSchema>;
        session.return_date = returnData.return_date;
        session.return_time = returnData.return_time;
      }

      saveTaxibookBooking(session);
      router.push("/operators");
    } catch {
      setFormError("Could not verify your locations. Please try again.");
    } finally {
      setIsProceeding(false);
    }
  });

  const dateLabel = isHero ? "Date (UK)" : "Pickup date (UK)";
  const timeLabel = isHero ? "Time (UK)" : "Pickup time (UK)";
  const ukTimeHint = "UK local time (GMT/BST). Weekend and out-of-hours surcharges use this.";
  const submitLabel = isHero ? "Get quotes" : "Continue to operators";

  const formFields = (
    <form onSubmit={onSubmit} noValidate>
      <div
        className={isHero ? "" : "mt-6"}
        role="group"
        aria-label="Booking type"
      >
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setTripType("one_way")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:px-5 ${
              bookingType === "one_way"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-700 hover:bg-white"
            }`}
          >
            One-way
          </button>
          <button
            type="button"
            onClick={() => setTripType("return")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:px-5 ${
              bookingType === "return"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-700 hover:bg-white"
            }`}
          >
            Return
          </button>
        </div>
      </div>

      {formError ? (
        <p
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <div className="mt-6">
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          <AddressAutocompleteInput
            id={`${idPrefix}-pickup`}
            label={
              <>
                <MapPin className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
                From (postcode or place)
              </>
            }
            placeholder="e.g. SW1A 1AA or Heathrow Airport"
            value={pickupAddress}
            selectedPlace={pickupPlace}
            onValueChange={(v) => setValue("pickup_address", v, { shouldValidate: true })}
            onPlaceSelect={setPickupPlace}
            error={errors.pickup_address?.message}
            disabled={isProceeding}
          />

          <AddressAutocompleteInput
            id={`${idPrefix}-dropoff`}
            label={
              <>
                <MapPin className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
                To (postcode or place)
              </>
            }
            placeholder="e.g. EC1A 1BB or London City Airport"
            value={dropoffAddress}
            selectedPlace={dropoffPlace}
            onValueChange={(v) => setValue("dropoff_address", v, { shouldValidate: true })}
            onPlaceSelect={setDropoffPlace}
            error={errors.dropoff_address?.message}
            disabled={isProceeding}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:gap-5">
          <div>
            <label
              htmlFor={`${idPrefix}-date`}
              className="flex items-center gap-2 text-sm font-medium text-content"
            >
              <Calendar className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              {dateLabel}
            </label>
            <input
              id={`${idPrefix}-date`}
              type="date"
              min={minDate}
              className={BOOK_TRIP_INPUT_CLASS}
              {...register("pickup_date")}
              aria-invalid={errors.pickup_date ? "true" : "false"}
            />
            <FieldError message={errors.pickup_date?.message} />
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-time`}
              className="flex items-center gap-2 text-sm font-medium text-content"
            >
              <Clock className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              {timeLabel}
            </label>
            <input
              id={`${idPrefix}-time`}
              type="time"
              className={BOOK_TRIP_INPUT_CLASS}
              {...register("pickup_time")}
              aria-invalid={errors.pickup_time ? "true" : "false"}
            />
            <FieldError message={errors.pickup_time?.message} />
          </div>
        </div>
        <p className="mt-1 text-xs text-content/55">{ukTimeHint}</p>

        <div
          className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
            bookingType === "return"
              ? "mt-4 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={bookingType !== "return"}
        >
          <div className="min-h-0">
            <div className="border-t border-slate-200 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-content/55">
                Return journey
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:gap-5">
                <div>
                  <label
                    htmlFor={`${idPrefix}-return-date`}
                    className="flex items-center gap-2 text-sm font-medium text-content"
                  >
                    <Calendar
                      className="h-4 w-4 shrink-0 text-secondary"
                      aria-hidden
                    />
                    Return date
                  </label>
                  <input
                    id={`${idPrefix}-return-date`}
                    type="date"
                    min={pickupDate || minDate}
                    className={BOOK_TRIP_INPUT_CLASS}
                    {...register("return_date")}
                    aria-invalid={errors.return_date ? "true" : "false"}
                    tabIndex={bookingType === "return" ? 0 : -1}
                  />
                  <FieldError message={errors.return_date?.message} />
                </div>
                <div>
                  <label
                    htmlFor={`${idPrefix}-return-time`}
                    className="flex items-center gap-2 text-sm font-medium text-content"
                  >
                    <Clock
                      className="h-4 w-4 shrink-0 text-secondary"
                      aria-hidden
                    />
                    Return time
                  </label>
                  <input
                    id={`${idPrefix}-return-time`}
                    type="time"
                    className={BOOK_TRIP_INPUT_CLASS}
                    {...register("return_time")}
                    aria-invalid={errors.return_time ? "true" : "false"}
                    tabIndex={bookingType === "return" ? 0 : -1}
                  />
                  <FieldError message={errors.return_time?.message} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          <div>
            <label
              htmlFor={`${idPrefix}-passengers`}
              className="flex items-center gap-2 text-sm font-medium text-content"
            >
              <Users className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              Passengers
            </label>
            <select
              id={`${idPrefix}-passengers`}
              className={BOOK_TRIP_INPUT_CLASS}
              {...register("passengers", { valueAsNumber: true })}
              aria-invalid={errors.passengers ? "true" : "false"}
            >
              {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "passenger" : "passengers"}
                </option>
              ))}
            </select>
            <FieldError message={errors.passengers?.message} />
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-service-type`}
              className="flex items-center gap-2 text-sm font-medium text-content"
            >
              <Car className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              Service type
            </label>
            <select
              id={`${idPrefix}-service-type`}
              className={BOOK_TRIP_INPUT_CLASS}
              {...register("service_type")}
              aria-invalid={errors.service_type ? "true" : "false"}
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SERVICE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <FieldError message={errors.service_type?.message} />
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-luggage`}
              className="flex items-center gap-2 text-sm font-medium text-content"
            >
              <Luggage className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              Luggage
            </label>
            <select
              id={`${idPrefix}-luggage`}
              className={BOOK_TRIP_INPUT_CLASS}
              {...register("luggage", { valueAsNumber: true })}
              aria-invalid={errors.luggage ? "true" : "false"}
            >
              {Array.from({ length: MAX_BOOKING_LUGGAGE + 1 }, (_, i) => i).map(
                (n) => (
                  <option key={n} value={n}>
                    {n === 0
                      ? "No luggage"
                      : `${n} ${n === 1 ? "piece" : "pieces"}`}
                  </option>
                ),
              )}
            </select>
            <FieldError message={errors.luggage?.message} />
          </div>
        </div>

        <div className="mt-4">
          {!notesOpen ? (
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-secondary transition hover:border-secondary/40 hover:bg-white"
            >
              Add special instructions
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <div>
              <label
                htmlFor={`${idPrefix}-notes`}
                className="text-sm font-medium text-content"
              >
                Special instructions (optional)
              </label>
              <textarea
                id={`${idPrefix}-notes`}
                rows={3}
                maxLength={500}
                placeholder="Flight number, accessibility needs…"
                className={`${BOOK_TRIP_INPUT_CLASS} mt-1.5 resize-y`}
                {...register("notes")}
                aria-invalid={errors.notes ? "true" : "false"}
              />
              <FieldError message={errors.notes?.message} />
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isProceeding}
        className={`${BOOK_TRIP_PRIMARY_ACTION_CLASS} mt-6 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isSubmitting || isProceeding ? "Saving…" : submitLabel}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </form>
  );

  if (isHero) {
    return <div className={CARD_CLASS}>{formFields}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className={CARD_CLASS}>
        <BookingStepper currentStep={1} />

        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-content sm:text-2xl">
            Book your ride
          </h1>
          <p className="mt-1.5 text-sm text-content/70">
            Enter your trip details to find available operators
          </p>
        </div>

        {formFields}
      </div>

      <p className="mt-4 text-center text-xs text-content/55">
        Prices shown are estimates. Final fare may vary based on traffic and
        route.
      </p>
    </div>
  );
}
