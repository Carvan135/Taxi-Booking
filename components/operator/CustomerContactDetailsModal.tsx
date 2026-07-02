"use client";

import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  gmailComposeHref,
  mailtoHref,
  telHref,
} from "@/lib/booking/operator-contact";

type CustomerContactDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  customerName: string;
  email: string | null;
  phone: string | null;
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

export function CustomerContactDetailsModal({
  open,
  onClose,
  customerName,
  email,
  phone,
  bookingReference,
}: CustomerContactDetailsModalProps) {
  return (
    <Modal
      open={open}
      title="Contact details"
      onClose={onClose}
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <p className="text-xs text-content/55">Booking #{bookingReference}</p>

      <div className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2.5">
        <DetailLine label="Customer" value={customerName} />
        {phone ? <DetailLine label="Phone" value={phone} /> : null}
        {email ? <DetailLine label="Email" value={email} /> : null}
      </div>

      {phone || email ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {phone ? (
            <a
              href={telHref(phone)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-content hover:bg-slate-50"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              Call
            </a>
          ) : null}
          {email ? (
            <a
              href={mailtoHref(email, bookingReference)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-content hover:bg-slate-50"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              Email
            </a>
          ) : null}
          {email ? (
            <a
              href={gmailComposeHref(email, bookingReference)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-content hover:bg-slate-50"
            >
              Gmail
            </a>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-content/60">
          No phone or email on file for this customer.
        </p>
      )}
    </Modal>
  );
}
