"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Shield, Star } from "lucide-react";
import {
  setOperatorSuspended,
  updateOperatorApproval,
} from "@/lib/actions/adminOperators";
import {
  adminOpPillApprove as pillApprove,
  adminOpPillNeutral as pillLink,
  adminOpPillReactivate as pillReactivate,
  adminOpPillReject as pillReject,
  adminOpPillSuspend as pillSuspend,
} from "@/components/admin/operatorAdminActionPills";
import { Button } from "@/components/ui/Button";

export type OperatorCardModel = {
  id: string;
  businessName: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  email: string;
  phone: string | null;
  /** Profile full name — included in search. */
  contactName: string | null;
  fleetVehicleCount: number;
  joinedIso: string;
  rating: number;
  totalReviews: number;
  verified: boolean;
  bookingsCount: number;
  revenueGbp: number;
};

function formatMoneyGBP(n: number): string {
  return `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function memberSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function displayPhone(phone: string | null): string {
  if (!phone?.trim()) return "—";
  return phone.trim();
}

/** Status pill next to Verified — black pills when approved (matches design). */
function statusPillClass(status: OperatorCardModel["status"]): string {
  switch (status) {
    case "approved":
      return "bg-slate-900 text-white ring-0";
    case "pending":
      return "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80";
    case "rejected":
      return "bg-red-100 text-red-800 ring-1 ring-red-200/80";
    case "suspended":
      return "bg-slate-200 text-slate-800 ring-1 ring-slate-300/80";
    default:
      return "bg-slate-100 text-slate-800 ring-1 ring-slate-200";
  }
}

function statusPillLabel(status: OperatorCardModel["status"]): string {
  if (status === "approved") return "active";
  return status;
}

export function OperatorsManagement({ rows }: { rows: OperatorCardModel[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | OperatorCardModel["status"]
  >("all");
  const [error, setError] = useState<string | null>(null);
  /** Which control is running a server action: `${operatorId}:${action}` */
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        r.businessName,
        r.email,
        r.phone ?? "",
        r.contactName ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, statusFilter]);

  async function runSuspend(id: string, suspended: boolean) {
    const action = suspended ? "suspend" : "reactivate";
    const key = `${id}:${action}`;
    setError(null);
    setBusyKey(key);
    try {
      const res = await setOperatorSuspended(id, suspended);
      if (!res.success) {
        setError(res.error ?? "Could not update operator.");
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function runApproval(id: string, next: "approved" | "rejected") {
    const key = `${id}:${next}`;
    setError(null);
    setBusyKey(key);
    try {
      const res = await updateOperatorApproval(id, next);
      if (!res.success) {
        setError(res.error ?? "Could not update operator.");
      }
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/60 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by operator name, email, or phone..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-[#111827] shadow-sm outline-none ring-0 placeholder:text-[#9CA3AF] focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              autoComplete="off"
            />
          </div>
          <div className="shrink-0 lg:w-52">
            <label htmlFor="operator-status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="operator-status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
              className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-[#111827] shadow-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.65rem center",
                backgroundSize: "1rem",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center text-sm text-[#6B7280]">
          No operators registered yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center text-sm text-[#6B7280]">
          No operators match your filters.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {filtered.map((op) => (
            <li
              key={op.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6 lg:p-7"
            >
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h2 className="text-xl font-bold tracking-tight text-[#111827] sm:text-2xl">
                    {op.businessName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {op.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        <Shield className="h-3.5 w-3.5" aria-hidden />
                        Verified
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold lowercase ${statusPillClass(op.status)}`}
                    >
                      {statusPillLabel(op.status)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 text-sm sm:grid-cols-2 sm:gap-x-10">
                  <div className="space-y-2.5 text-[#6B7280]">
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      <span className="text-[#374151]">{op.email}</span>
                    </p>
                    <p>
                      <span className="font-medium">Vehicles:</span>{" "}
                      <span className="text-[#374151]">
                        {op.fleetVehicleCount}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-2.5 text-[#6B7280]">
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      <span className="text-[#374151]">
                        {displayPhone(op.phone)}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">Member since:</span>{" "}
                      <span className="text-[#374151]">
                        {memberSince(op.joinedIso)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#6B7280] sm:text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <Star
                        className="h-3.5 w-3.5 shrink-0 text-amber-500 sm:h-4 sm:w-4"
                        aria-hidden
                      />
                      <span className="font-medium text-[#374151]">
                        {op.totalReviews > 0
                          ? Number(op.rating).toFixed(1)
                          : "—"}
                      </span>
                    </span>
                    <span>
                      <span className="font-medium">Bookings:</span>{" "}
                      <span className="text-[#374151]">
                        {op.bookingsCount.toLocaleString("en-GB")}
                      </span>
                    </span>
                    <span>
                      <span className="font-medium">Revenue:</span>{" "}
                      <span className="text-[#374151]">
                        {formatMoneyGBP(op.revenueGbp)}
                      </span>
                    </span>
                  </div>

                  <div className="flex shrink-0 flex-row flex-wrap items-center justify-start gap-1.5 sm:justify-end">
                    <Link href={`/admin/operators/${op.id}`} className={pillLink}>
                      View Details
                    </Link>
                    {op.status === "pending" ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          loading={busyKey === `${op.id}:approved`}
                          disabled={busyKey !== null}
                          onClick={() => void runApproval(op.id, "approved")}
                          className={pillApprove}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          loading={busyKey === `${op.id}:rejected`}
                          disabled={busyKey !== null}
                          onClick={() => void runApproval(op.id, "rejected")}
                          className={pillReject}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {op.status === "approved" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={busyKey === `${op.id}:suspend`}
                        disabled={busyKey !== null}
                        onClick={() => void runSuspend(op.id, true)}
                        className={pillSuspend}
                      >
                        Suspend
                      </Button>
                    ) : null}
                    {op.status === "suspended" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={busyKey === `${op.id}:reactivate`}
                        disabled={busyKey !== null}
                        onClick={() => void runSuspend(op.id, false)}
                        className={pillReactivate}
                      >
                        Reactivate
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
