import Link from "next/link";
import {
  buildAdminBookingsQueryString,
  type AdminBookingsListParams,
} from "@/lib/booking/admin-bookings-query";

type AdminBookingsPaginationProps = {
  query: AdminBookingsListParams;
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
};

export function AdminBookingsPagination({
  query,
  page,
  totalPages,
  totalCount,
  pageSize,
}: AdminBookingsPaginationProps) {
  if (totalCount === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  const prevHref =
    page > 1
      ? `/admin/bookings${buildAdminBookingsQueryString({ ...query, page: page - 1 })}`
      : null;
  const nextHref =
    page < totalPages
      ? `/admin/bookings${buildAdminBookingsQueryString({ ...query, page: page + 1 })}`
      : null;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <p className="text-sm text-[#6B7280]">
        Showing {from}–{to} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-slate-50"
          >
            Previous
          </Link>
        ) : (
          <span className="inline-flex min-h-9 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
            Previous
          </span>
        )}
        <span className="px-2 text-sm text-[#6B7280]">
          Page {page} of {totalPages}
        </span>
        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-slate-50"
          >
            Next
          </Link>
        ) : (
          <span className="inline-flex min-h-9 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
