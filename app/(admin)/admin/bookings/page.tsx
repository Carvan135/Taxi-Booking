import { AdminBookingsManagement } from "@/components/admin/AdminBookingsManagement";
import { parseAdminBookingsSearchParams } from "@/lib/booking/admin-bookings-query";
import {
  fetchAdminBookingsPage,
  fetchAdminBookingsSummary,
  fetchOperatorsForBookingFilter,
} from "@/lib/booking/fetch-admin-bookings";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {};
  const query = parseAdminBookingsSearchParams(resolved);

  const [pageResult, summary, filterOperators] = await Promise.all([
    fetchAdminBookingsPage(query),
    fetchAdminBookingsSummary(query),
    fetchOperatorsForBookingFilter(),
  ]);

  return (
    <AdminBookingsManagement
      bookings={pageResult.rows}
      totalCount={pageResult.totalCount}
      page={pageResult.page}
      totalPages={pageResult.totalPages}
      pageSize={pageResult.pageSize}
      summary={summary}
      query={query}
      filterOperators={filterOperators}
    />
  );
}
