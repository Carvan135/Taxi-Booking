import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBookingStatusBadge } from "@/components/admin/AdminBookingStatusBadge";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: { id: string };
};

export default async function AdminBookingDetailPage({ params }: PageProps) {
  const supabase = createClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      operators!bookings_operator_id_fkey ( business_name, vehicle_type ),
      profiles!bookings_customer_id_fkey ( full_name, email )
    `,
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !booking) {
    notFound();
  }

  const op = booking.operators as
    | { business_name: string; vehicle_type: string }
    | { business_name: string; vehicle_type: string }[]
    | null;
  const operator = Array.isArray(op) ? op[0] : op;
  const profile = booking.profiles as
    | { full_name: string | null; email: string }
    | { full_name: string | null; email: string }[]
    | null;
  const customer = Array.isArray(profile) ? profile[0] : profile;

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 text-sm font-medium text-secondary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to bookings
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[#111827]">
              #{booking.reference}
            </h1>
            <AdminBookingStatusBadge status={booking.status} />
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <Detail
              label="Customer"
              value={
                customer?.full_name?.trim() ||
                booking.customer_name?.trim() ||
                "Guest"
              }
            />
            <Detail
              label="Email"
              value={customer?.email ?? booking.customer_email}
            />
            <Detail label="Pickup" value={booking.pickup_address} />
            <Detail label="Dropoff" value={booking.dropoff_address} />
            <Detail
              label="Date & time"
              value={`${booking.pickup_date} ${String(booking.pickup_time).slice(0, 5)}`}
            />
            <Detail
              label="Price"
              value={
                booking.price != null
                  ? `£${Number(booking.price).toFixed(2)}`
                  : "—"
              }
            />
            {operator ? (
              <Detail
                label="Operator"
                value={`${operator.business_name} · ${operator.vehicle_type}`}
              />
            ) : null}
            <Detail
              label="Commission"
              value={`£${Number(booking.platform_commission ?? 0).toFixed(2)}`}
            />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[#6B7280]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[#111827]">{value}</dd>
    </div>
  );
}
