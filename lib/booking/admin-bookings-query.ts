import type { BookingStatus } from "@/lib/validations/enums";
import { BOOKING_STATUS } from "@/lib/validations/enums";

export const ADMIN_BOOKINGS_PAGE_SIZE = 20;

export type AdminBookingsStatusFilter = BookingStatus | "all" | "disputed";

export type AdminBookingsListParams = {
  search: string;
  status: AdminBookingsStatusFilter;
  operatorId: string | "all" | "unassigned";
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
};

export function parseAdminBookingsSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): AdminBookingsListParams {
  const get = (key: string): string | undefined => {
    const value = searchParams[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
  };

  const statusRaw = get("status") ?? "all";
  const validStatuses: AdminBookingsStatusFilter[] = [
    "all",
    "disputed",
    BOOKING_STATUS.pending,
    BOOKING_STATUS.confirmed,
    BOOKING_STATUS.completed,
    BOOKING_STATUS.cancelled,
  ];
  const status = validStatuses.includes(statusRaw as AdminBookingsStatusFilter)
    ? (statusRaw as AdminBookingsStatusFilter)
    : "all";

  const operatorRaw = get("operator") ?? "all";
  const operatorId =
    operatorRaw === "all" || operatorRaw === "unassigned"
      ? operatorRaw
      : operatorRaw;

  const page = Math.max(1, Number.parseInt(get("page") ?? "1", 10) || 1);

  return {
    search: (get("q") ?? "").trim(),
    status,
    operatorId,
    dateFrom: get("from") ?? "",
    dateTo: get("to") ?? "",
    page,
    pageSize: ADMIN_BOOKINGS_PAGE_SIZE,
  };
}

export function buildAdminBookingsQueryString(
  params: Partial<AdminBookingsListParams> & { page?: number },
): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set("q", params.search);
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.operatorId && params.operatorId !== "all") {
    sp.set("operator", params.operatorId);
  }
  if (params.dateFrom) sp.set("from", params.dateFrom);
  if (params.dateTo) sp.set("to", params.dateTo);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}
