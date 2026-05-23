import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingCompletionPanel } from "@/components/booking/BookingCompletionPanel";
import { BookingReviewPanel } from "@/components/booking/BookingReviewPanel";
import { formatBookingLanguage } from "@/lib/booking/language-display";
import { BookingStatusBadge } from "@/components/booking/BookingStatusBadge";
import { BookingStatusTimeline } from "@/components/booking/BookingStatusTimeline";
import {
  canCustomerReviewBooking,
  mapBookingReviewJoin,
} from "@/lib/booking/customer-review";
import type { BookingStatus } from "@/lib/validations/enums";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerBookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/bookings/${id}`)}`);
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      operators!bookings_operator_id_fkey ( business_name ),
      booking_reviews ( id, rating, comment, created_at )
    `,
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error || !booking) {
    notFound();
  }

  const review = mapBookingReviewJoin(
    booking.booking_reviews as Parameters<typeof mapBookingReviewJoin>[0],
  );
  const operatorJoin = booking.operators as
    | { business_name: string }
    | { business_name: string }[]
    | null;
  const operatorName = Array.isArray(operatorJoin)
    ? operatorJoin[0]?.business_name ?? null
    : operatorJoin?.business_name ?? null;
  const canReview = canCustomerReviewBooking({
    status: booking.status,
    operator_id: booking.operator_id,
    review,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/bookings"
        className="text-sm font-medium text-secondary hover:underline"
      >
        ← Back to bookings
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Booking #{booking.reference}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {booking.pickup_date} at {booking.pickup_time.slice(0, 5)}
          </p>
        </div>
        <BookingStatusBadge status={booking.status as BookingStatus} />
      </header>

      <div className="mt-6">
        <BookingStatusTimeline status={booking.status as BookingStatus} />
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">From</p>
          <p className="mt-1 text-content">{booking.pickup_address}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">To</p>
          <p className="mt-1 text-content">{booking.dropoff_address}</p>
        </div>
        {booking.price != null ? (
          <p className="text-lg font-semibold text-primary">
            £{Number(booking.price).toFixed(2)}
          </p>
        ) : null}
        {booking.language ? (
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Preferred language
            </p>
            <p className="mt-1 text-content">
              {formatBookingLanguage(booking.language)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        <BookingCompletionPanel booking={booking} />
        <BookingReviewPanel
          bookingId={booking.id}
          operatorName={operatorName}
          canReview={canReview}
          existingReview={review}
        />
      </div>
    </div>
  );
}
