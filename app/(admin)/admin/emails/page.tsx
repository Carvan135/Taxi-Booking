import { AdminEmailLogsManagement } from "@/components/admin/AdminEmailLogsManagement";
import { parseAdminEmailLogsSearchParams } from "@/lib/admin/admin-email-logs-query";
import { fetchAdminEmailLogsPage } from "@/lib/admin/fetch-admin-email-logs";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminEmailLogsPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {};
  const query = parseAdminEmailLogsSearchParams(resolved);
  const pageResult = await fetchAdminEmailLogsPage(query);

  return (
    <AdminEmailLogsManagement
      logs={pageResult.rows}
      totalCount={pageResult.totalCount}
      page={pageResult.page}
      totalPages={pageResult.totalPages}
      pageSize={pageResult.pageSize}
      summary={pageResult.summary}
      query={query}
    />
  );
}
