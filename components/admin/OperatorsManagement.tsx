"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shield, Star } from "lucide-react";
import { AdminOperatorsFilters } from "@/components/admin/AdminOperatorsFilters";
import { AdminOperatorsPagination } from "@/components/admin/AdminOperatorsPagination";
import type { AdminOperatorsListParams } from "@/lib/admin/admin-operators-query";
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

type OperatorsManagementProps = {
  rows: OperatorCardModel[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  query: AdminOperatorsListParams;
};

export function OperatorsManagement({
  rows,
  totalCount,
  page,
  totalPages,
  pageSize,
  query,
}: OperatorsManagementProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const hasFilters = query.search !== "" || query.status !== "all";

  async function runSuspend(id: string, suspended: boolean) {
    const action = suspended ? "suspend" : "reactivate";
    const key = `${id}:${action}`;
    setError(null);
    setBusyKey(key);
    try {
      const res = await setOperatorSuspended(id, suspended);
      if (!res.success) {
        setError(res.error ?? "Could not update operator.");
      } else {
        router.refresh();
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
      } else {
        router.refresh();
      }
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminOperatorsFilters query={query} />

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {totalCount === 0 && !hasFilters ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center text-sm text-[#6B7280]">
          No operators registered yet.
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center text-sm text-[#6B7280]">
          No operators match your filters.
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {rows.map((op) => (
              <OperatorListCard
                key={op.id}
                op={op}
                busyKey={busyKey}
                onApprove={(id) => void runApproval(id, "approved")}
                onReject={(id) => void runApproval(id, "rejected")}
                onSuspend={(id) => void runSuspend(id, true)}
                onReactivate={(id) => void runSuspend(id, false)}
              />
            ))}
          </ul>
          <AdminOperatorsPagination
            query={query}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
          />
        </>
      )}
    </div>
  );
}

function OperatorListCard({
  op,
  busyKey,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
}: {
  op: OperatorCardModel;
  busyKey: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
}) {
  return (
    <li className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
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
              <span className="text-[#374151]">{op.fleetVehicleCount}</span>
            </p>
          </div>
          <div className="space-y-2.5 text-[#6B7280]">
            <p>
              <span className="font-medium">Phone:</span>{" "}
              <span className="text-[#374151]">{displayPhone(op.phone)}</span>
            </p>
            <p>
              <span className="font-medium">Member since:</span>{" "}
              <span className="text-[#374151]">{memberSince(op.joinedIso)}</span>
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
                {op.totalReviews > 0 ? Number(op.rating).toFixed(1) : "—"}
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
                  onClick={() => onApprove(op.id)}
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
                  onClick={() => onReject(op.id)}
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
                onClick={() => onSuspend(op.id)}
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
                onClick={() => onReactivate(op.id)}
                className={pillReactivate}
              >
                Reactivate
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}


