"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  buildAdminBookingsQueryString,
  type AdminBookingsListParams,
} from "@/lib/booking/admin-bookings-query";
import type { OperatorFilterOption } from "@/lib/booking/fetch-admin-bookings";
import { BOOKING_STATUS } from "@/lib/validations/enums";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "disputed", label: "Disputed" },
  { value: "refunded", label: "Refunded" },
  { value: BOOKING_STATUS.pending, label: "Pending" },
  { value: BOOKING_STATUS.confirmed, label: "Confirmed" },
  { value: BOOKING_STATUS.completed, label: "Completed" },
  { value: BOOKING_STATUS.cancelled, label: "Cancelled" },
] as const;

type AdminBookingsFiltersProps = {
  query: AdminBookingsListParams;
  filterOperators: OperatorFilterOption[];
};

export function AdminBookingsFilters({
  query,
  filterOperators,
}: AdminBookingsFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearch(query.search);
  }, [query.search]);

  const navigate = useCallback(
    (patch: Partial<AdminBookingsListParams>) => {
      const next: AdminBookingsListParams = {
        ...query,
        ...patch,
        page: patch.page ?? 1,
      };
      const href = `/admin/bookings${buildAdminBookingsQueryString(next)}`;
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
            placeholder="Search by booking ID, customer, or operator…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-content outline-none ring-secondary/30 placeholder:text-slate-400 focus:border-secondary focus:ring-2"
            aria-label="Search bookings"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:shrink-0">
          <select
            value={query.operatorId}
            onChange={(e) =>
              navigate({
                operatorId: e.target
                  .value as AdminBookingsListParams["operatorId"],
              })
            }
            disabled={isPending}
            className={selectClass}
            aria-label="Filter by operator"
          >
            <option value="all">All Operators</option>
            <option value="unassigned">Unassigned</option>
            {filterOperators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.business_name}
              </option>
            ))}
          </select>

          <select
            value={query.status}
            onChange={(e) =>
              navigate({
                status: e.target
                  .value as AdminBookingsListParams["status"],
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

          <div className="flex flex-col gap-1">
            <label
              htmlFor="bookings-date-from"
              className="text-xs font-medium text-[#6B7280]"
            >
              Start date
            </label>
            <input
              id="bookings-date-from"
              type="date"
              value={query.dateFrom}
              onChange={(e) => navigate({ dateFrom: e.target.value })}
              disabled={isPending}
              className={selectClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="bookings-date-to"
              className="text-xs font-medium text-[#6B7280]"
            >
              End date
            </label>
            <input
              id="bookings-date-to"
              type="date"
              value={query.dateTo}
              onChange={(e) => navigate({ dateTo: e.target.value })}
              disabled={isPending}
              className={selectClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
