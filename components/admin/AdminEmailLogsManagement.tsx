"use client";

import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { AdminEmailLogsFilters } from "@/components/admin/AdminEmailLogsFilters";
import { AdminEmailLogsPagination } from "@/components/admin/AdminEmailLogsPagination";
import type { AdminEmailLogsListParams } from "@/lib/admin/admin-email-logs-query";
import type {
  AdminEmailLogRow,
  AdminEmailLogsSummary,
} from "@/lib/admin/fetch-admin-email-logs";
import { formatEmailTypeLabel } from "@/lib/email/email-type-labels";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "sent":
      return "bg-emerald-50 text-emerald-800";
    case "failed":
      return "bg-red-50 text-red-800";
    case "bounced":
      return "bg-amber-50 text-amber-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

type AdminEmailLogsManagementProps = {
  logs: AdminEmailLogRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  summary: AdminEmailLogsSummary;
  query: AdminEmailLogsListParams;
};

export function AdminEmailLogsManagement({
  logs,
  totalCount,
  page,
  totalPages,
  pageSize,
  summary,
  query,
}: AdminEmailLogsManagementProps) {
  const hasFilters =
    query.search !== "" ||
    query.status !== "all" ||
    query.emailType !== "all";

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
              Email log
            </h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              All transactional emails sent through Resend
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Matching emails
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#111827]">
              {summary.total.toLocaleString("en-GB")}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/80">
              Sent
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-900">
              {summary.sent.toLocaleString("en-GB")}
            </p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-red-800/80">
              Failed / bounced
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-red-900">
              {(summary.failed + summary.bounced).toLocaleString("en-GB")}
            </p>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <AdminEmailLogsFilters query={query} />

          {logs.length === 0 ? (
            <div className="mt-8 rounded-xl bg-slate-50 px-4 py-12 text-center">
              <Mail
                className="mx-auto h-8 w-8 text-slate-300"
                aria-hidden
              />
              <p className="mt-3 text-sm font-medium text-[#111827]">
                No emails found
              </p>
              <p className="mt-1 text-sm text-[#6B7280]">
                {hasFilters
                  ? "Try changing your filters or search term."
                  : "Emails will appear here after booking confirmations, receipts, and other notifications are sent."}
              </p>
            </div>
          ) : (
            <>
              <ul className="mt-6 divide-y divide-slate-100">
                {logs.map((log) => (
                  <li key={log.id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#111827]">
                            {formatEmailTypeLabel(log.email_type)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(log.status)}`}
                          >
                            {log.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#374151]">
                          To: {log.email_to}
                        </p>
                        {log.subject ? (
                          <p className="mt-0.5 text-xs text-[#6B7280]">
                            {log.subject}
                          </p>
                        ) : null}
                        {log.booking_id && log.booking_reference ? (
                          <p className="mt-1.5 text-xs">
                            <Link
                              href={`/admin/bookings/${log.booking_id}`}
                              className="font-medium text-secondary hover:underline"
                            >
                              Booking #{log.booking_reference}
                            </Link>
                          </p>
                        ) : log.booking_id ? (
                          <p className="mt-1.5 text-xs">
                            <Link
                              href={`/admin/bookings/${log.booking_id}`}
                              className="font-medium text-secondary hover:underline"
                            >
                              View booking
                            </Link>
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-[#9CA3AF]">
                          {formatWhen(log.created_at)}
                        </p>
                        {log.resend_id ? (
                          <p className="mt-1 font-mono text-[10px] text-[#9CA3AF]">
                            {log.resend_id}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {log.status === "sent" ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Delivered via Resend
                      </p>
                    ) : null}

                    {log.error_message ? (
                      <p
                        className="mt-2 flex items-start gap-1.5 text-xs text-red-700"
                        role="alert"
                      >
                        <AlertCircle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        <span>{log.error_message}</span>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>

              <AdminEmailLogsPagination
                query={query}
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
