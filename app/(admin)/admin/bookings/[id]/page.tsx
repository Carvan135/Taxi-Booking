import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBookingDetailPanel } from "@/components/admin/AdminBookingDetailPanel";
import { fetchAdminBookingDetail } from "@/lib/admin/fetch-admin-booking-detail";
import { getPartialRefundEnabled } from "@/lib/booking/platform-settings-server";

type PageProps = {
  params: { id: string };
};

export default async function AdminBookingDetailPage({ params }: PageProps) {
  const [booking, partialRefundEnabled] = await Promise.all([
    fetchAdminBookingDetail(params.id),
    getPartialRefundEnabled(),
  ]);

  if (!booking) {
    notFound();
  }

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

        <div className="mt-6">
          <AdminBookingDetailPanel
            booking={booking}
            partialRefundEnabled={partialRefundEnabled}
          />
        </div>
      </div>
    </div>
  );
}
