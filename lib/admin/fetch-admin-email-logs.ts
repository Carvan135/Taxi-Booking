import type { AdminEmailLogsListParams } from "@/lib/admin/admin-email-logs-query";
import { createClient } from "@/lib/supabase/server";
import type { EmailLog, EmailLogStatus } from "@/types";

export type AdminEmailLogRow = EmailLog & {
  booking_reference: string | null;
};

export type AdminEmailLogsSummary = {
  total: number;
  sent: number;
  failed: number;
  bounced: number;
};

export type AdminEmailLogsPageResult = {
  rows: AdminEmailLogRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: AdminEmailLogsSummary;
};

function sanitizeSearch(term: string): string {
  return term.replace(/[%_]/g, "").trim();
}

function applyEmailLogFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  params: AdminEmailLogsListParams,
) {
  let q = query;

  if (params.status !== "all") {
    q = q.eq("status", params.status);
  }

  if (params.emailType !== "all") {
    q = q.eq("email_type", params.emailType);
  }

  if (params.search) {
    const cleaned = sanitizeSearch(params.search);
    if (cleaned) {
      const pattern = `%${cleaned}%`;
      q = q.or(`email_to.ilike.${pattern},subject.ilike.${pattern}`);
    }
  }

  return q;
}

export async function fetchAdminEmailLogsPage(
  params: AdminEmailLogsListParams,
): Promise<AdminEmailLogsPageResult> {
  const supabase = createClient();
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let listQuery = supabase
    .from("email_logs")
    .select("*, bookings ( reference )", { count: "exact" });

  listQuery = applyEmailLogFilters(listQuery, params);

  const { data, count, error } = await listQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("fetchAdminEmailLogsPage:", error);
    return {
      rows: [],
      totalCount: 0,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: 0,
      summary: { total: 0, sent: 0, failed: 0, bounced: 0 },
    };
  }

  const rows: AdminEmailLogRow[] = (data ?? []).map((row) => {
    const booking = row.bookings as { reference: string } | null;
    const log = row as EmailLog & {
      bookings: { reference: string } | null;
    };
    return {
      id: log.id,
      booking_id: log.booking_id,
      user_id: log.user_id,
      email_to: log.email_to,
      email_type: log.email_type,
      subject: log.subject,
      status: log.status,
      resend_id: log.resend_id,
      error_message: log.error_message,
      created_at: log.created_at,
      booking_reference: booking?.reference ?? null,
    };
  });

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / params.pageSize));

  const summary = await fetchAdminEmailLogsSummary(params);

  return {
    rows,
    totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages,
    summary,
  };
}

async function fetchAdminEmailLogsSummary(
  params: AdminEmailLogsListParams,
): Promise<AdminEmailLogsSummary> {
  const supabase = createClient();

  const countFor = async (
    status?: EmailLogStatus,
  ): Promise<number> => {
    let query = supabase
      .from("email_logs")
      .select("*", { count: "exact", head: true });
    query = applyEmailLogFilters(query, {
      ...params,
      status: status ?? params.status,
    });
    const { count, error } = await query;
    if (error) {
      console.error("fetchAdminEmailLogsSummary count:", error);
      return 0;
    }
    return count ?? 0;
  };

  if (params.status !== "all") {
    const total = await countFor();
    return {
      total,
      sent: params.status === "sent" ? total : 0,
      failed: params.status === "failed" ? total : 0,
      bounced: params.status === "bounced" ? total : 0,
    };
  }

  const [total, sent, failed, bounced] = await Promise.all([
    countFor(),
    countFor("sent"),
    countFor("failed"),
    countFor("bounced"),
  ]);

  return { total, sent, failed, bounced };
}
