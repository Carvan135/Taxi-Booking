"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  buildAdminOperatorsQueryString,
  type AdminOperatorsListParams,
} from "@/lib/admin/admin-operators-query";
import { OPERATOR_STATUS } from "@/lib/validations/enums";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: OPERATOR_STATUS.approved, label: "Active" },
  { value: OPERATOR_STATUS.pending, label: "Pending" },
  { value: OPERATOR_STATUS.rejected, label: "Rejected" },
  { value: OPERATOR_STATUS.suspended, label: "Suspended" },
] as const;

type AdminOperatorsFiltersProps = {
  query: AdminOperatorsListParams;
};

export function AdminOperatorsFilters({ query }: AdminOperatorsFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearch(query.search);
  }, [query.search]);

  const navigate = useCallback(
    (patch: Partial<AdminOperatorsListParams>) => {
      const next: AdminOperatorsListParams = {
        ...query,
        ...patch,
        page: patch.page ?? 1,
      };
      const href = `/admin/operators${buildAdminOperatorsQueryString(next)}`;
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
    "w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-[#111827] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:opacity-60";

  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 ${isPending ? "opacity-70 transition-opacity" : ""}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by operator name, email, or phone…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            autoComplete="off"
            aria-label="Search operators"
          />
        </div>
        <div className="w-full lg:w-52">
          <label
            htmlFor="operator-status-filter"
            className="mb-1.5 block text-xs font-medium text-[#6B7280]"
          >
            Status
          </label>
          <select
            id="operator-status-filter"
            value={query.status}
            onChange={(e) =>
              navigate({
                status: e.target.value as AdminOperatorsListParams["status"],
              })
            }
            disabled={isPending}
            className={selectClass}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.65rem center",
              backgroundSize: "1rem",
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
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
