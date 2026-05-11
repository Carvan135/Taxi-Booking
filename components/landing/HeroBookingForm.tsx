"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  BOOK_TRIP_PRIMARY_ACTION_CLASS,
  BookTripDetailsFields,
} from "@/components/booking/BookTripDetailsFields";
import { emptyTripDraft } from "@/components/booking/types";

export function HeroBookingForm() {
  const [trip, setTrip] = useState(emptyTripDraft);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-7 lg:p-8">
      <BookTripDetailsFields
        idPrefix="hero"
        value={trip}
        onChange={(patch) => setTrip((t) => ({ ...t, ...patch }))}
        twoColumnFromTo
        tripToggleSize="default"
        dateLabel="Date"
        timeLabel="Time"
        tripToggleWrapperClassName=""
        fieldsWrapperClassName="mt-6"
        action={
          <Link href="/book" className={BOOK_TRIP_PRIMARY_ACTION_CLASS}>
            Get quotes
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
    </div>
  );
}
