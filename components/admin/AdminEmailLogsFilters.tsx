"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  buildAdminEmailLogsQueryString,
  type AdminEmailLogsListParams,
} from "@/lib/admin/admin-email-logs-query";
import { EMAIL_TYPE_FILTER_OPTIONS } from "@/lib/email/email-type-labels";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "bounced", label: "Bounced" },
] as const;

type AdminEmailLogsFiltersProps = {
  query: AdminEmailLogsListParams;
};

export function AdminEmailLogsFilters({ query }: AdminEmailLogsFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearch(query.search);
  }, [query.search]);

  const navigate = useCallback(
    (patch: Partial<AdminEmailLogsListParams>) => {
      const next: AdminEmailLogsListParams = {
        ...query,
        ...patch,
        page: patch.page ?? 1,
      };
      const href = `/admin/emails${buildAdminEmailLogsQueryString(next)}`;
      startTransition(() => {
        router.push(href);
      });
    },
    [query, router],
  );

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ search: value, page: 1 });
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectClass =
    "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-content outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 disabled:opacity-60";

  return (
    <div className={isPending ? "opacity-70 transition-opacity" : undefined}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search recipient or subject…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-content outline-none ring-secondary/30 placeholder:text-slate-400 focus:border-secondary focus:ring-2"
            aria-label="Search email logs"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
          <select
            value={query.status}
            onChange={(e) =>
              navigate({
                status: e.target.value as AdminEmailLogsListParams["status"],
              })
            }
            disabled={isPending}
            className={selectClass}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={query.emailType}
            onChange={(e) => navigate({ emailType: e.target.value })}
            disabled={isPending}
            className={selectClass}
            aria-label="Filter by email type"
          >
            {EMAIL_TYPE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
