import { OperatorsManagement } from "@/components/admin/OperatorsManagement";
import { parseAdminOperatorsSearchParams } from "@/lib/admin/admin-operators-query";
import { fetchAdminOperatorsPage } from "@/lib/admin/fetch-admin-operators";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminOperatorsPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {};
  const query = parseAdminOperatorsSearchParams(resolved);
  const pageResult = await fetchAdminOperatorsPage(query);

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
            Operators Management
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Manage and monitor all platform operators
          </p>
        </header>

        <div className="mt-8">
          <OperatorsManagement
            rows={pageResult.rows}
            totalCount={pageResult.totalCount}
            page={pageResult.page}
            totalPages={pageResult.totalPages}
            pageSize={pageResult.pageSize}
            query={query}
          />
        </div>
      </div>
    </div>
  );
}
