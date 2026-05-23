"use client";

import { Mail, Phone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { gmailComposeHref, telHref } from "@/lib/booking/operator-contact";
import type { CustomerBookingOperator } from "@/types";

type OperatorContactModalProps = {
  open: boolean;
  onClose: () => void;
  operator: CustomerBookingOperator;
  bookingReference: string;
};

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <p className="text-sm leading-snug text-content">
      <span className="text-content/50">{label}: </span>
      <span className="font-medium">{value}</span>
    </p>
  );
}

export function OperatorContactModal({
  open,
  onClose,
  operator,
  bookingReference,
}: OperatorContactModalProps) {
  const ratingLabel =
    operator.total_reviews > 0
      ? `${operator.rating.toFixed(1)} (${operator.total_reviews})`
      : "—";

  return (
    <Modal open={open} title={operator.business_name} onClose={onClose}>
      <p className="text-xs text-content/55">Booking #{bookingReference}</p>

      <div className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2.5">
        {operator.contact_name ? (
          <DetailLine label="Contact" value={operator.contact_name} />
        ) : null}
        <DetailLine label="Vehicle" value={operator.vehicle_type} />
        <DetailLine label="Rating" value={ratingLabel} />
        {operator.business_address ? (
          <p className="text-sm leading-snug text-content">
            <span className="text-content/50">Address: </span>
            <span className="font-medium line-clamp-2">
              {operator.business_address}
            </span>
          </p>
        ) : null}
        {operator.business_description ? (
          <p className="text-sm leading-snug text-content">
            <span className="text-content/50">About: </span>
            <span className="font-medium line-clamp-2">
              {operator.business_description}
            </span>
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {operator.phone ? (
          <a
            href={telHref(operator.phone)}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-content transition hover:border-secondary/40 hover:bg-secondary/5"
          >
            <Phone className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
            {operator.phone}
          </a>
        ) : null}
        {operator.email ? (
          <a
            href={gmailComposeHref(operator.email, bookingReference)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-content transition hover:border-secondary/40 hover:bg-secondary/5"
          >
            <Mail className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
            <span className="truncate">{operator.email}</span>
          </a>
        ) : null}
      </div>

      {!operator.phone && !operator.email ? (
        <p className="mt-3 text-sm text-content/60">
          No phone or email on file for this operator.
        </p>
      ) : null}
    </Modal>
  );
}
