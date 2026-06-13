"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BookingsTabsList } from "@/components/booking/BookingsTabsList";
import { BOOK_TRIP_INPUT_CLASS } from "@/components/booking/booking-form-styles";
import { Button } from "@/components/ui/Button";
import { mapLookupResponseToBookings } from "@/lib/booking/map-lookup-bookings";
import {
  loadTaxibookGuestSession,
  saveTaxibookGuestSession,
} from "@/lib/booking/session";
import type { CustomerBookingRow } from "@/types";

type LookupApiResponse = Parameters<typeof mapLookupResponseToBookings>[0];

export default function BookingsLookupPage() {
  const searchParams = useSearchParams();
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<CustomerBookingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refFromUrl = searchParams.get("ref")?.trim();
    const emailFromUrl = searchParams.get("email")?.trim();
    if (refFromUrl) setReference(refFromUrl);
    if (emailFromUrl) setEmail(emailFromUrl);

    const guest = loadTaxibookGuestSession();
    if (!emailFromUrl && guest?.email) setEmail(guest.email);
    if (!refFromUrl && guest?.reference) setReference(guest.reference);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBookings(null);

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

    setLoading(true);
    try {
      const params = new URLSearchParams({ ref, email: guestEmail });
      const res = await fetch(`/api/bookings/by-reference?${params.toString()}`);
      const body = (await res.json()) as LookupApiResponse & { error?: string };

      if (!res.ok) {
        setError(body.error ?? "No booking found for this reference and email.");
        return;
      }

      const rows = mapLookupResponseToBookings(body);
      setBookings(rows);

      const bookingId = rows[0]?.id;
      if (bookingId) {
        saveTaxibookGuestSession({
          bookingId,
          email: guestEmail,
          reference: ref,
        });
      }
    } catch {
      setError("Could not look up your booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-2xl font-bold text-content sm:text-3xl">
            View your booking
          </h1>
          <p className="mt-2 text-sm text-content/70">
            Enter the reference and email from your AirportHub confirmation — no
            account required.
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
            Find booking
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
            <BookingsTabsList
              bookings={bookings}
              title="Your booking"
              subtitle="Looked up by reference and email. Unpaid bookings can be completed or cancelled below."
              lookupEmail={email.trim().toLowerCase()}
              onUnpaidCancelled={() => {
                setBookings((prev) =>
                  prev?.filter((b) => b.status !== "cancelled") ?? null,
                );
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
