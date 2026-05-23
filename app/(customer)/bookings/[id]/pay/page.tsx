import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ResumePaymentCheckout } from "@/components/booking/ResumePaymentCheckout";
import { canResumeBookingPayment } from "@/lib/booking/booking-payment";
import { createClient } from "@/lib/supabase/server";
import type { Booking } from "@/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerBookingPayPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/complete-payment?id=${encodeURIComponent(id)}`);
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error || !booking) {
    notFound();
  }

  if (!canResumeBookingPayment(booking)) {
    redirect(`/bookings/${id}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <Link
        href={`/bookings/${id}`}
        className="text-sm font-medium text-secondary hover:underline"
      >
        ← Back to booking
      </Link>
      <div className="mt-6">
        <ResumePaymentCheckout
          booking={booking as Booking}
          backHref={`/bookings/${id}`}
          isAuthenticated
        />
      </div>
    </div>
  );
}
