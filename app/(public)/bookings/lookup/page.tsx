"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookingsTabsList } from "@/components/booking/BookingsTabsList";
import { BOOK_TRIP_INPUT_CLASS } from "@/components/booking/booking-form-styles";
import { Button } from "@/components/ui/Button";
import { needsCustomerCompletionAction } from "@/lib/booking/customer-completion-ui";
import { mapLookupResponseToBookings } from "@/lib/booking/map-lookup-bookings";
import {
  loadTaxibookGuestSession,
  saveTaxibookGuestSession,
} from "@/lib/booking/session";
import type { CustomerBookingRow } from "@/types";

type LookupApiResponse = Parameters<typeof mapLookupResponseToBookings>[0];

async function fetchGuestBookings(
  ref: string,
  guestEmail: string,
): Promise<{ bookings: CustomerBookingRow[] } | { error: string }> {
  const params = new URLSearchParams({ ref, email: guestEmail });
  const res = await fetch(`/api/bookings/by-reference?${params.toString()}`);
  const body = (await res.json()) as LookupApiResponse & { error?: string };

  if (!res.ok) {
    return { error: body.error ?? "No booking found for this reference and email." };
  }

  return { bookings: mapLookupResponseToBookings(body) };
}

export default function BookingsLookupPage() {
  const searchParams = useSearchParams();
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<CustomerBookingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoLookupDone, setAutoLookupDone] = useState(false);

  useEffect(() => {
    const refFromUrl = searchParams.get("ref")?.trim();
    const emailFromUrl = searchParams.get("email")?.trim();
    if (refFromUrl) setReference(refFromUrl);
    if (emailFromUrl) setEmail(emailFromUrl);

    const guest = loadTaxibookGuestSession();
    if (!emailFromUrl && guest?.email) setEmail(guest.email);
    if (!refFromUrl && guest?.reference) setReference(guest.reference);
  }, [searchParams]);

  const runLookup = useCallback(async (ref: string, guestEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      const result = await fetchGuestBookings(ref, guestEmail);
      if ("error" in result) {
        setBookings(null);
        setError(result.error);
        return;
      }

      setBookings(result.bookings);

      const bookingId = result.bookings[0]?.id;
      if (bookingId) {
        saveTaxibookGuestSession({
          bookingId,
          email: guestEmail,
          reference: ref,
        });
      }
    } catch {
      setBookings(null);
      setError("Could not look up your booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLookupDone) return;

    const refFromUrl = searchParams.get("ref")?.trim();
    const emailFromUrl = searchParams.get("email")?.trim();
    const guest = loadTaxibookGuestSession();

    const ref = refFromUrl || guest?.reference || "";
    const guestEmail = emailFromUrl || guest?.email || "";

    if (ref && guestEmail) {
      setAutoLookupDone(true);
      void runLookup(ref, guestEmail);
    }
  }, [autoLookupDone, runLookup, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const ref = reference.trim();
    const guestEmail = email.trim();

    if (!ref) {
      setError("Enter your booking reference.");
      return;
    }
    if (!guestEmail) {
      setError("Enter the email used when you booked.");
      return;
    }

    await runLookup(ref, guestEmail);
  }

  const needsAction = useMemo(
    () => bookings?.some((booking) => needsCustomerCompletionAction(booking)) ?? false,
    [bookings],
  );

  const lookupEmail = email.trim().toLowerCase();

  return (
    <section className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-2xl font-bold text-content sm:text-3xl">
            View your booking
          </h1>
          <p className="mt-2 text-sm text-content/70">
            Enter the reference and email from your confirmation to check status,
            confirm completion, raise a dispute, or leave a review — no account
            required.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-8 max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="lookup_ref" className="text-sm font-medium text-content">
              Booking reference
            </label>
            <input
              id="lookup_ref"
              type="text"
              placeholder="TB-XXXXXXXX"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={`${BOOK_TRIP_INPUT_CLASS} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="lookup_email" className="text-sm font-medium text-content">
              Email address
            </label>
            <input
              id="lookup_email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${BOOK_TRIP_INPUT_CLASS} mt-1.5`}
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" loading={loading} className="w-full">
            {bookings ? "Refresh booking" : "Find booking"}
          </Button>
        </form>

        <p className="mx-auto mt-6 max-w-md text-center text-sm text-content/65">
          Have an account?{" "}
          <Link
            href="/login?redirect=/bookings"
            className="font-semibold text-secondary hover:underline"
          >
            Sign in
          </Link>
        </p>

        {bookings && bookings.length > 0 ? (
          <div className="mt-10 border-t border-slate-200 pt-8">
            {needsAction ? (
              <p
                className="mx-auto mb-6 max-w-3xl rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
                role="status"
              >
                <strong className="font-semibold">Action needed:</strong> your
                operator marked this ride complete. Please confirm delivery or
                raise a dispute below.
              </p>
            ) : null}
            <BookingsTabsList
              bookings={bookings}
              title="Your booking"
              subtitle="Track journey status, confirm completion, rate your trip, or complete payment if needed."
              lookupEmail={lookupEmail}
              onUnpaidCancelled={() => {
                setBookings((prev) =>
                  prev?.filter((b) => b.status !== "cancelled") ?? null,
                );
              }}
              onBookingRefresh={() => {
                const ref = reference.trim();
                const guestEmail = email.trim();
                if (ref && guestEmail) {
                  void runLookup(ref, guestEmail);
                }
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
