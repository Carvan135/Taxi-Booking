"use client";

import { useState } from "react";
import {
  setOperatorSuspended,
  updateOperatorApproval,
} from "@/lib/actions/adminOperators";
import { Button } from "@/components/ui/Button";
import {
  adminOpPillApprove,
  adminOpPillReject,
  adminOpPillReactivate,
  adminOpPillSuspend,
} from "@/components/admin/operatorAdminActionPills";

export type OperatorDetailStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

type OperatorDetailActionsProps = {
  operatorId: string;
  status: OperatorDetailStatus;
  className?: string;
};

export function OperatorDetailActions({
  operatorId,
  status,
  className = "",
}: OperatorDetailActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "approve" | "reject" | "suspend" | "reactivate" | null
  >(null);

  async function runApproval(next: "approved" | "rejected") {
    const action = next === "approved" ? "approve" : "reject";
    setError(null);
    setBusyAction(action);
    try {
      const res = await updateOperatorApproval(operatorId, next);
      if (!res.success) {
        setError(res.error ?? "Could not update operator.");
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function runSuspend(suspended: boolean) {
    const action = suspended ? "suspend" : "reactivate";
    setError(null);
    setBusyAction(action);
    try {
      const res = await setOperatorSuspended(operatorId, suspended);
      if (!res.success) {
        setError(res.error ?? "Could not update operator.");
      }
    } finally {
      setBusyAction(null);
    }
  }

  const hasActions =
    status === "pending" ||
    status === "approved" ||
    status === "suspended";

  if (!hasActions) {
    return null;
  }

  const busy = busyAction !== null;

  return (
    <div className={className}>
      {error ? (
        <div
          className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-1.5">
        {status === "pending" ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={busyAction === "approve"}
              disabled={busy}
              onClick={() => void runApproval("approved")}
              className={adminOpPillApprove}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={busyAction === "reject"}
              disabled={busy}
              onClick={() => void runApproval("rejected")}
              className={adminOpPillReject}
            >
              Reject
            </Button>
          </>
        ) : null}
        {status === "approved" ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={busyAction === "suspend"}
            disabled={busy}
            onClick={() => void runSuspend(true)}
            className={adminOpPillSuspend}
          >
            Suspend
          </Button>
        ) : null}
        {status === "suspended" ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={busyAction === "reactivate"}
            disabled={busy}
            onClick={() => void runSuspend(false)}
            className={adminOpPillReactivate}
          >
            Reactivate
          </Button>
        ) : null}
      </div>
    </div>
  );
}
