import Link from "next/link";
import { notFound } from "next/navigation";
import { ResumePaymentCheckout } from "@/components/booking/ResumePaymentCheckout";
import { canResumeBookingPayment } from "@/lib/booking/booking-payment";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Booking } from "@/types";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function param(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function CompletePaymentPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const id = param(sp.id)?.trim();
  const email = param(sp.email)?.trim();

  if (!id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-content/70">
          Missing booking. Use{" "}
          <Link href="/bookings/lookup" className="font-semibold text-secondary underline">
            booking lookup
          </Link>{" "}
          to find your trip.
        </p>
      </div>
    );
  }

  const supabase = createServiceRoleClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !booking) {
    notFound();
  }

  if (!canResumeBookingPayment(booking)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-primary">Payment not required</h1>
        <p className="mt-2 text-sm text-content/70">
          This booking is already paid or no longer awaiting payment.
        </p>
        <Link
          href="/bookings/lookup"
          className="mt-4 inline-block text-sm font-semibold text-secondary underline"
        >
          Look up your booking
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm font-medium text-secondary hover:underline">
        ← Home
      </Link>
      <div className="mt-6">
        <ResumePaymentCheckout
          booking={booking as Booking}
          guestEmail={email}
          backHref="/bookings/lookup"
        />
      </div>
    </div>
  );
}
