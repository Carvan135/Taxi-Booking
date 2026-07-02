"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  Car,
  CheckCircle2,
  Mail,
  MapPin,
  PoundSterling,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { BOOK_TRIP_INPUT_CLASS } from "@/components/booking/booking-form-styles";
import { TripLocationBadges } from "@/components/booking/TripLocationBadges";
import { formatRouteSummary } from "@/lib/booking/trip-display";
import { loadConfirmationSnapshot } from "@/lib/booking/session";
import { guestSession } from "@/lib/guest/session";
import { guestSignUpAndClaimBookingsClient } from "@/lib/guest/account";
import { signUpSchema } from "@/lib/validations/auth";
import { formatBookingVehicleType } from "@/lib/operator/fleet-vehicle-types";
import type { ServiceType } from "@/lib/validations/enums";
import { createClient } from "@/lib/supabase/client";
import { SITE_EMAILS } from "@/lib/site/contact";

const guestPasswordSchema = z.object({
  password: signUpSchema.shape.password,
});

type GuestPasswordInput = z.infer<typeof guestPasswordSchema>;

type ConfirmationLeg = {
  id: string;
  reference: string;
  leg: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_date: string;
  pickup_time: string;
  passengers: number;
  service_type: ServiceType;
  price: number | null;
  operator: { business_name: string; vehicle_type: string } | null;
};

type ConfirmationData = {
  reference: string;
  group_reference: string | null;
  booking_type: string;
  total_paid: number;
  customer_email: string;
  customer_name: string | null;
  is_guest: boolean;
  operator: { business_name: string; vehicle_type: string } | null;
  legs: ConfirmationLeg[];
};

export default function ConfirmationContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref")?.trim() ?? "";

  const [booking, setBooking] = useState<ConfirmationData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">(
    "loading",
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const confirmationEmailAttemptedRef = useRef(false);
  const confirmationSnapshot = useMemo(() => loadConfirmationSnapshot(), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GuestPasswordInput>({
    resolver: zodResolver(guestPasswordSchema),
    defaultValues: { password: "" },
  });

  const fetchBooking = useCallback(async () => {
    if (!refParam) {
      setLoadState("error");
      return;
    }

    setLoadState("loading");
    const storedGuest = guestSession.get();
    const email =
      storedGuest?.email ?? confirmationSnapshot?.customer_email ?? undefined;
    if (email) setGuestEmail(email);

    const params = new URLSearchParams({ ref: refParam });
    if (email) params.set("email", email);

    try {
      const res = await fetch(`/api/bookings/by-reference?${params.toString()}`);
      const body = (await res.json()) as ConfirmationData & { error?: string };

      if (!res.ok) {
        setBooking(null);
        setLoadState("error");
        return;
      }

      setBooking(body);
      if (!email && body.customer_email) {
        setGuestEmail(body.customer_email);
      }
      setLoadState("ready");
    } catch {
      setBooking(null);
      setLoadState("error");
    }
  }, [refParam, confirmationSnapshot?.customer_email]);

  useEffect(() => {
    void fetchBooking();
  }, [fetchBooking]);

  useEffect(() => {
    if (loadState !== "ready" || !booking || confirmationEmailAttemptedRef.current) {
      return;
    }
    confirmationEmailAttemptedRef.current = true;

    const email = (guestEmail || booking.customer_email).trim();
    void fetch("/api/bookings/send-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: booking.reference,
        email: email || undefined,
      }),
    }).catch((err) => {
      console.error("auto send confirmation email:", err);
    });
  }, [loadState, booking, guestEmail]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(Boolean(user));
    });
  }, []);

  const showGuestSignup =
    loadState === "ready" &&
    booking?.is_guest &&
    !isAuthenticated &&
    !claimSuccess;

  const onGuestSignUp = handleSubmit(async ({ password }) => {
    if (!booking) return;
    setClaimError(null);

    const result = await guestSignUpAndClaimBookingsClient(
      {
        email: guestEmail || booking.customer_email,
        password,
        full_name:
          booking.customer_name?.trim() || "Guest Customer",
      },
      queryClient,
    );

    if (!result.success) {
      setClaimError(result.error ?? "Could not create your account.");
      return;
    }

    setClaimSuccess(true);
    setIsAuthenticated(true);
  });

  const resendConfirmationEmail = async () => {
    if (!booking) return;
    setToast(null);
    try {
      const res = await fetch("/api/bookings/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: booking.reference,
          email: (guestEmail || booking.customer_email).trim() || undefined,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setToast(body.error ?? "Could not resend email. Check admin email log.");
      } else {
        setToast("Confirmation email sent from AirportHub.");
      }
    } catch {
      setToast("Could not resend email.");
    }
    window.setTimeout(() => setToast(null), 3200);
  };

  const bookingsHref = isAuthenticated ? "/bookings" : "/bookings/lookup";
  const reference = booking?.reference ?? refParam;

  if (!refParam) {
    return (
      <ConfirmationShell>
        <ErrorState message="No booking reference was provided." />
      </ConfirmationShell>
    );
  }

  if (loadState === "loading") {
    return (
      <ConfirmationShell>
        <p className="py-16 text-center text-sm text-content/60">
          Loading your confirmation…
        </p>
      </ConfirmationShell>
    );
  }

  if (loadState === "error" || !booking) {
    return (
      <ConfirmationShell>
        <ErrorState message="We could not find a booking with this reference." />
      </ConfirmationShell>
    );
  }

  const outbound =
    booking.legs.find((l) => l.leg === "outbound") ?? booking.legs[0]!;
  const isReturn = booking.booking_type === "return" && booking.legs.length > 1;
  const operator =
    booking.operator ?? outbound.operator ?? null;
  const snapshotTrip = confirmationSnapshot?.trip;
  const routeSummary = formatRouteSummary(snapshotTrip?.route);

  return (
    <ConfirmationShell>
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}

      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 animate-scale-in-check">
          <CheckCircle2
            className="h-11 w-11 text-emerald-600"
            strokeWidth={2.5}
            aria-hidden
          />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-content sm:text-3xl">
          Booking Confirmed!
        </h1>
        <p className="mt-2 text-sm text-content/70 sm:text-base">
          Your ride has been successfully booked
        </p>
        <p className="mt-5 inline-block rounded-full bg-[#1E3A5F]/10 px-5 py-2 text-lg font-bold tracking-wide text-[#1E3A5F] sm:text-xl">
          {reference}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5">
        <h2 className="text-base font-bold text-primary">Booking Details</h2>

        {snapshotTrip ? (
          <TripLocationBadges trip={snapshotTrip} className="mt-4" />
        ) : null}
        {routeSummary ? (
          <p className="mt-3 text-sm font-medium text-content">{routeSummary}</p>
        ) : null}

        {isReturn ? (
          <div className="mt-5 space-y-6">
            {booking.legs.map((leg) => (
              <LegSummary
                key={leg.id}
                leg={leg}
                label={leg.leg === "return" ? "Return" : "Outbound"}
                pickupIsAirport={
                  leg.leg === "return"
                    ? snapshotTrip?.dropoff?.isAirport
                    : snapshotTrip?.pickup?.isAirport
                }
                dropoffIsAirport={
                  leg.leg === "return"
                    ? snapshotTrip?.pickup?.isAirport
                    : snapshotTrip?.dropoff?.isAirport
                }
              />
            ))}
            <ul className="space-y-3 border-t border-slate-100 pt-4 text-sm">
              <DetailRow
                icon={Car}
                label="Vehicle type"
                value={formatBookingVehicleType(outbound.service_type)}
              />
              <DetailRow
                icon={Users}
                label="Passengers"
                value={`${outbound.passengers} ${outbound.passengers === 1 ? "passenger" : "passengers"}`}
              />
            </ul>
          </div>
        ) : (
          <ul className="mt-5 space-y-3 text-sm">
            <DetailRow
              icon={MapPin}
              label="Pickup"
              value={formatConfirmationAddress(
                outbound.pickup_address,
                snapshotTrip?.pickup?.isAirport,
              )}
            />
            <DetailRow
              icon={MapPin}
              label="Dropoff"
              value={formatConfirmationAddress(
                outbound.dropoff_address,
                snapshotTrip?.dropoff?.isAirport,
              )}
            />
            <DetailRow
              icon={Calendar}
              label="Date & Time"
              value={`${outbound.pickup_date} at ${outbound.pickup_time}`}
            />
            <DetailRow
              icon={Car}
              label="Vehicle type"
              value={formatBookingVehicleType(outbound.service_type)}
            />
            <DetailRow
              icon={Users}
              label="Passengers"
              value={`${outbound.passengers} ${outbound.passengers === 1 ? "passenger" : "passengers"}`}
            />
          </ul>
        )}

        {operator ? (
          <div className="mt-5 border-t border-slate-100 pt-5 text-sm">
            <p className="text-content/55">Operator</p>
            <p className="mt-0.5 font-semibold text-content">
              {operator.business_name}
            </p>
            <p className="text-content/70">{operator.vehicle_type}</p>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
          <span className="flex items-center gap-2 text-sm font-semibold text-content">
            <PoundSterling className="h-4 w-4 text-secondary" aria-hidden />
            Price paid
          </span>
          <span className="text-xl font-bold text-secondary">
            £{booking.total_paid.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-[#1E3A5F]/15 bg-[#1E3A5F]/5 px-5 py-5 text-sm shadow-sm">
        <p className="flex items-center gap-2 font-bold text-[#1E3A5F]">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
          What happens next
        </p>
        <p className="mt-2 text-content/70">
          A confirmation email from AirportHub is on its way to{" "}
          <span className="font-medium text-content">
            {booking.customer_email}
          </span>
          . You can view your booking anytime without signing in.
        </p>
        <ol className="mt-4 space-y-3">
          {[
            "Check your inbox — the email is your confirmation",
            "Your operator may contact you before pickup",
            "View or manage your booking from the link in the email",
          ].map((text, i) => (
            <li key={text} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1E3A5F] text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-content/80">{text}</span>
            </li>
          ))}
        </ol>
      </div>

      {showGuestSignup ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-content">
            Save your booking to your account
          </h2>
          <p className="mt-1 text-sm text-content/65">
            Create a password to access this booking and future trips in one place.
          </p>

          <form onSubmit={onGuestSignUp} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="guest_email"
                className="text-sm font-medium text-content"
              >
                Email
              </label>
              <input
                id="guest_email"
                type="email"
                readOnly
                value={guestEmail || booking.customer_email}
                className={`${BOOK_TRIP_INPUT_CLASS} mt-1.5 bg-slate-50`}
              />
            </div>
            <div>
              <label
                htmlFor="guest_password"
                className="text-sm font-medium text-content"
              >
                Password
              </label>
              <input
                id="guest_password"
                type="password"
                autoComplete="new-password"
                placeholder="Set your password"
                className={`${BOOK_TRIP_INPUT_CLASS} mt-1.5`}
                {...register("password")}
              />
              {errors.password?.message ? (
                <p className="mt-1.5 text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            {claimError ? (
              <p className="text-sm text-red-600" role="alert">
                {claimError}
              </p>
            ) : null}

            <Button type="submit" loading={isSubmitting} className="w-full">
              Create Account &amp; Save Booking
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-content/65">
            Already have an account?{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(`/confirmation?ref=${encodeURIComponent(reference)}`)}`}
              className="font-semibold text-secondary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      ) : null}

      {claimSuccess ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900">
          Your account is ready. All bookings for this email are now linked to you.
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <button
          type="button"
          onClick={() => void resendConfirmationEmail()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-content shadow-sm transition hover:bg-slate-50"
        >
          <Mail className="h-4 w-4" aria-hidden />
          Resend confirmation email
        </button>
        <Link
          href={
            isAuthenticated
              ? bookingsHref
              : `/bookings/lookup?${new URLSearchParams({
                  ref: reference,
                  email: (guestEmail || booking.customer_email).trim(),
                }).toString()}`
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E3A5F] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#16304f]"
        >
          View Your Booking
        </Link>
      </div>

      <div className="mt-10 text-sm text-content/70">
        <p className="font-semibold text-content">Need Help?</p>
        <p className="mt-2">
          If you have any questions or need to make changes to your booking, our
          support team is here to help.
        </p>
        <p className="mt-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-secondary" aria-hidden />
          <a
            href={`mailto:${SITE_EMAILS.support}`}
            className="hover:text-secondary"
          >
            {SITE_EMAILS.support}
          </a>
        </p>
        <p className="mt-1 text-content/65">
          <Link href="/faq" className="font-medium text-secondary hover:underline">
            Visit our FAQ
          </Link>{" "}
          for cancellation and refund information.
        </p>
      </div>
    </ConfirmationShell>
  );
}

function ConfirmationShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">{children}</div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-lg font-semibold text-content">Booking not found</p>
      <p className="mt-2 text-sm text-content/65">{message}</p>
      <a
        href={`mailto:${SITE_EMAILS.support}`}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground shadow-md transition hover:bg-blue-600"
      >
        Contact Support
      </a>
    </div>
  );
}

function formatConfirmationAddress(address: string, isAirport?: boolean): string {
  if (isAirport) return `${address} (Airport)`;
  return address;
}

function LegSummary({
  leg,
  label,
  pickupIsAirport,
  dropoffIsAirport,
}: {
  leg: ConfirmationLeg;
  label: string;
  pickupIsAirport?: boolean;
  dropoffIsAirport?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-wide text-secondary">
        {label}
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        <DetailRow
          icon={MapPin}
          label="Pickup"
          value={formatConfirmationAddress(leg.pickup_address, pickupIsAirport)}
        />
        <DetailRow
          icon={MapPin}
          label="Dropoff"
          value={formatConfirmationAddress(leg.dropoff_address, dropoffIsAirport)}
        />
        <DetailRow
          icon={Calendar}
          label="Date & Time"
          value={`${leg.pickup_date} at ${leg.pickup_time}`}
        />
        {leg.price != null ? (
          <DetailRow
            icon={PoundSterling}
            label="Leg fare"
            value={`£${Number(leg.price).toFixed(2)}`}
          />
        ) : null}
      </ul>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
      <div>
        <p className="text-content/55">{label}</p>
        <p className="font-medium text-content">{value}</p>
      </div>
    </li>
  );
}
