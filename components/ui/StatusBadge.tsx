export type StatusBadgeStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "confirmed"
  | "completed"
  | "cancelled";

const styles: Record<
  StatusBadgeStatus,
  { className: string; label: string }
> = {
  pending: {
    className: "bg-amber-100 text-amber-900 ring-amber-200/80",
    label: "Pending",
  },
  approved: {
    className: "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
    label: "Approved",
  },
  rejected: {
    className: "bg-red-100 text-red-800 ring-red-200/80",
    label: "Rejected",
  },
  suspended: {
    className: "bg-slate-200 text-slate-800 ring-slate-300/80",
    label: "Suspended",
  },
  confirmed: {
    className: "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
    label: "Confirmed",
  },
  completed: {
    className: "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
    label: "Completed",
  },
  cancelled: {
    className: "bg-red-100 text-red-800 ring-red-200/80",
    label: "Cancelled",
  },
};

export type StatusBadgeProps = {
  status: StatusBadgeStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = styles[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}
