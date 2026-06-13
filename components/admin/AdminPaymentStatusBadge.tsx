import type { PaymentStatus } from "@/types";

const STYLES: Record<PaymentStatus, string> = {
  unpaid: "bg-amber-50 text-amber-900 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  refunded: "bg-violet-50 text-violet-900 ring-violet-200",
  failed: "bg-red-50 text-red-800 ring-red-200",
};

const LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  refunded: "Refunded",
  failed: "Failed",
};

export function AdminPaymentStatusBadge({
  status,
}: {
  status: PaymentStatus | string;
}) {
  const key = (status in STYLES ? status : "unpaid") as PaymentStatus;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[key]}`}
    >
      {LABELS[key]}
    </span>
  );
}
