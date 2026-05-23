import { OPERATOR_STATUS, type OperatorStatus } from "@/lib/validations/enums";

export const ADMIN_OPERATORS_PAGE_SIZE = 10;

export type AdminOperatorsListParams = {
  search: string;
  status: OperatorStatus | "all";
  page: number;
  pageSize: number;
};

export function parseAdminOperatorsSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): AdminOperatorsListParams {
  const get = (key: string): string | undefined => {
    const value = searchParams[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
  };

  const statusRaw = get("status") ?? "all";
  const validStatuses: (OperatorStatus | "all")[] = [
    "all",
    OPERATOR_STATUS.pending,
    OPERATOR_STATUS.approved,
    OPERATOR_STATUS.rejected,
    OPERATOR_STATUS.suspended,
  ];
  const status = validStatuses.includes(statusRaw as OperatorStatus | "all")
    ? (statusRaw as OperatorStatus | "all")
    : "all";

  const page = Math.max(1, Number.parseInt(get("page") ?? "1", 10) || 1);

  return {
    search: (get("q") ?? "").trim(),
    status,
    page,
    pageSize: ADMIN_OPERATORS_PAGE_SIZE,
  };
}

export function buildAdminOperatorsQueryString(
  params: Partial<AdminOperatorsListParams> & { page?: number },
): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set("q", params.search);
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}
