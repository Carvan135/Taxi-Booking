"use client";

import { useTransition, useState } from "react";
import { updateOperatorApproval } from "@/lib/actions/adminOperators";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";

export type PendingOperatorRow = {
  id: string;
  businessName: string;
  operatorName: string;
  joinedAtLabel: string;
};

export function PendingOperatorsPanel({
  operators,
}: {
  operators: PendingOperatorRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(id: string, status: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      const res = await updateOperatorApproval(id, status);
      if (!res.success) {
        setError(res.error ?? "Could not update operator.");
      }
    });
  }

  if (operators.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-content/70">
        No operators awaiting approval.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-content/70">
            <tr>
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operators.map((op) => (
              <tr key={op.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-content">
                  {op.operatorName}
                </td>
                <td className="px-4 py-3 text-content/80">{op.businessName}</td>
                <td className="px-4 py-3 text-content/70">{op.joinedAtLabel}</td>
                <td className="px-4 py-3">
                  <StatusBadge status="pending" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isPending}
                      onClick={() => run(op.id, "approved")}
                      className="!min-h-8 bg-emerald-600 !text-white hover:opacity-95 focus-visible:ring-emerald-600"
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={() => run(op.id, "rejected")}
                      className="!min-h-8 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
