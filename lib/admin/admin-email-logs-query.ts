import type { EmailLogStatus } from "@/types";

export const ADMIN_EMAIL_LOGS_PAGE_SIZE = 25;

export type AdminEmailLogsStatusFilter = EmailLogStatus | "all";

export type AdminEmailLogsListParams = {
  search: string;
  status: AdminEmailLogsStatusFilter;
  emailType: string;
  page: number;
  pageSize: number;
};

const VALID_STATUSES: AdminEmailLogsStatusFilter[] = [
  "all",
  "sent",
  "failed",
  "bounced",
];

export function parseAdminEmailLogsSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): AdminEmailLogsListParams {
  const get = (key: string): string | undefined => {
    const value = searchParams[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
  };

  const statusRaw = get("status") ?? "all";
  const status = VALID_STATUSES.includes(statusRaw as AdminEmailLogsStatusFilter)
    ? (statusRaw as AdminEmailLogsStatusFilter)
    : "all";

  const page = Math.max(1, Number.parseInt(get("page") ?? "1", 10) || 1);

  return {
    search: (get("q") ?? "").trim(),
    status,
    emailType: get("type") ?? "all",
    page,
    pageSize: ADMIN_EMAIL_LOGS_PAGE_SIZE,
  };
}

export function buildAdminEmailLogsQueryString(
  params: Partial<AdminEmailLogsListParams> & { page?: number },
): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set("q", params.search);
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.emailType && params.emailType !== "all") {
    sp.set("type", params.emailType);
  }
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}
