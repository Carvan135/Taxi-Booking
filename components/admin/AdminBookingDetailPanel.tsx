"use client";

import { Mail, MessageSquare, PoundSterling, Scale, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AdminBookingStatusBadge } from "@/components/admin/AdminBookingStatusBadge";
import { AdminPaymentStatusBadge } from "@/components/admin/AdminPaymentStatusBadge";
import { formatEmailTypeLabel } from "@/lib/email/email-type-labels";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  resolveDisputeCustomerWins,
  resolveDisputeOperatorWins,
} from "@/lib/actions/adminDisputes";
import type { AdminBookingDetail } from "@/lib/admin/fetch-admin-booking-detail";
import {
  useMarkBookingCompleteMutation,
  useProcessRefundMutation,
  useReleasePayoutMutation,
  useResendConfirmationMutation,
  useResendSmsReminderMutation,
} from "@/hooks/queries/useAdminBookings";
import {
  COMPLETION_STATUS,
  BOOKING_STATUS,
  PAYMENT_STATUSES,
} from "@/lib/validations/enums";

function formatMoney(amount: number | null): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return `£${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function actorLabel(
  actor: { full_name: string | null; email: string } | null,
): string {
  if (!actor) return "—";
  return actor.full_name?.trim() || actor.email;
}

type AdminBookingDetailPanelProps = {
  booking: AdminBookingDetail;
  partialRefundEnabled: boolean;
};

export function AdminBookingDetailPanel({
  booking,
  partialRefundEnabled,
}: AdminBookingDetailPanelProps) {
  const router = useRouter();
  const completeMutation = useMarkBookingCompleteMutation();
  const releasePayoutMutation = useReleasePayoutMutation();
  const processRefundMutation = useProcessRefundMutation();
  const resendConfirmationMutation = useResendConfirmationMutation();
  const resendSmsReminderMutation = useResendSmsReminderMutation();

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [partialModalOpen, setPartialModalOpen] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const isDisputed =
    booking.completion_status === COMPLETION_STATUS.disputed;

  async function handleComplete() {
    setActionError(null);
    setBusy("complete");
    try {
      await completeMutation.mutateAsync(booking.id);
      router.refresh();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not mark complete",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleReleasePayout() {
    setActionError(null);
    setBusy("payout");
    try {
      await releasePayoutMutation.mutateAsync(booking.id);
      router.refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not release payout");
    } finally {
      setBusy(null);
    }
  }

  async function resolveCustomer(refundType: "full" | "partial", amount?: number) {
    setActionError(null);
    setBusy("dispute-customer");
    try {
      const res = await resolveDisputeCustomerWins(booking.id, {
        refundType,
        refundAmount: amount,
      });
      if (!res.success) {
        setActionError(res.error ?? "Could not resolve dispute.");
      } else {
        setPartialModalOpen(false);
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function resolveOperator() {
    setActionError(null);
    setBusy("dispute-operator");
    try {
      const res = await resolveDisputeOperatorWins(booking.id);
      if (!res.success) {
        setActionError(res.error ?? "Could not resolve dispute.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  const canAdminComplete =
    booking.status === BOOKING_STATUS.confirmed &&
    booking.completion_status === COMPLETION_STATUS.none;

  const canReleasePayout =
    booking.status === BOOKING_STATUS.completed && !booking.payout_released_at;

  const hasPaymentIntent = Boolean(booking.stripe_payment_intent_id);
  const alreadyRefunded = booking.payment_status === PAYMENT_STATUSES[2];
  const canIssueRefund =
    hasPaymentIntent &&
    booking.payment_status === PAYMENT_STATUSES[1] &&
    !alreadyRefunded;

  async function handleProcessRefund() {
    setActionError(null);
    setActionSuccess(null);
    setBusy("refund");
    const amount = Number(refundAmount);
    const reason = refundReason.trim();
    if (!reason) {
      setActionError("Please enter a reason for the refund.");
      setBusy(null);
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError("Enter a valid refund amount.");
      setBusy(null);
      return;
    }
    try {
      await processRefundMutation.mutateAsync({
        bookingId: booking.id,
        amount,
        reason,
      });
      setRefundModalOpen(false);
      setRefundAmount("");
      setRefundReason("");
      setActionSuccess("Refund processed via Stripe.");
      router.refresh();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not process refund",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleResendConfirmation() {
    setActionError(null);
    setActionSuccess(null);
    setBusy("resend");
    try {
      await resendConfirmationMutation.mutateAsync(booking.id);
      setActionSuccess("Confirmation email resent.");
      router.refresh();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not resend confirmation",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleResendSmsReminder() {
    setActionError(null);
    setActionSuccess(null);
    setBusy("resend-sms");
    try {
      await resendSmsReminderMutation.mutateAsync(booking.id);
      setActionSuccess("SMS reminder sent.");
      router.refresh();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not resend SMS reminder",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-[#111827]">
            #{booking.reference}
          </h1>
          <AdminBookingStatusBadge status={booking.status} />
          <AdminPaymentStatusBadge status={booking.payment_status} />
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <Detail
            label="Customer"
            value={
              booking.customer?.full_name?.trim() ||
              booking.customer_name?.trim() ||
              "Guest"
            }
          />
          <Detail
            label="Email"
            value={booking.customer?.email ?? booking.customer_email}
          />
          <Detail label="Pickup" value={booking.pickup_address} />
          <Detail label="Dropoff" value={booking.dropoff_address} />
          <Detail
            label="Date & time"
            value={`${booking.pickup_date} ${booking.pickup_time.slice(0, 5)}`}
          />
          {booking.operator ? (
            <Detail
              label="Operator"
              value={`${booking.operator.business_name} · ${booking.operator.vehicle_type}`}
            />
          ) : null}
        </dl>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <PoundSterling className="h-5 w-5 text-secondary" aria-hidden />
          <h2 className="text-lg font-semibold text-[#111827]">
            Financial history
          </h2>
        </div>
        <p className="mt-1 text-sm text-[#6B7280]">
          Payment, refund, and cancellation audit for this booking
        </p>

        <ol className="mt-5 space-y-4">
          <FinancialEvent
            title="Trip price"
            amount={formatMoney(booking.price)}
            meta={`Commission ${formatMoney(booking.platform_commission)} · Operator ${formatMoney(booking.operator_payout)}`}
          />
          <FinancialEvent
            title="Payment"
            amount={formatMoney(booking.price)}
            badge={
              <AdminPaymentStatusBadge status={booking.payment_status} />
            }
            meta={
              booking.stripe_payment_intent_id
                ? `Stripe PI ${booking.stripe_payment_intent_id}`
                : "No payment intent on file"
            }
          />
          {booking.refunded_at || booking.refund_amount != null ? (
            <FinancialEvent
              title="Refund"
              amount={formatMoney(booking.refund_amount)}
              meta={[
                booking.refund_type
                  ? `Type: ${booking.refund_type}`
                  : null,
                booking.refunded_at
                  ? `Processed ${formatWhen(booking.refunded_at)}`
                  : null,
                booking.refunded_by
                  ? `By ${actorLabel(booking.refunded_by)}`
                  : null,
                booking.stripe_refund_id
                  ? `Stripe refund ${booking.stripe_refund_id}`
                  : "Stripe refund not recorded yet",
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          ) : null}
          {booking.cancelled_at ? (
            <FinancialEvent
              title="Cancellation"
              amount="—"
              meta={[
                `Cancelled ${formatWhen(booking.cancelled_at)}`,
                booking.cancelled_by
                  ? `By ${actorLabel(booking.cancelled_by)}`
                  : null,
                booking.cancellation_reason,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          ) : null}
          {booking.payout_released_at ? (
            <FinancialEvent
              title="Operator payout released"
              amount={formatMoney(booking.operator_payout)}
              meta={formatWhen(booking.payout_released_at)}
            />
          ) : booking.payout_eligible_at ? (
            <FinancialEvent
              title="Payout eligible from"
              amount="—"
              meta={formatWhen(booking.payout_eligible_at)}
            />
          ) : null}
        </ol>
      </section>

      {hasPaymentIntent ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <PoundSterling className="h-5 w-5 text-secondary" aria-hidden />
            <h2 className="text-lg font-semibold text-[#111827]">
              Refund management
            </h2>
            {alreadyRefunded ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Refund processed
              </span>
            ) : null}
          </div>

          {canIssueRefund ? (
            <>
              <p className="mt-2 text-sm text-[#6B7280]">
                Trip price: <strong>{formatMoney(booking.price)}</strong>
              </p>
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                This immediately processes a refund via Stripe. The customer
                will be notified by email.
              </p>
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-content">
                  Amount (£)
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    max={booking.price ?? undefined}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="mt-1.5 w-full max-w-xs rounded-xl border border-gray-300 bg-slate-50 px-3 py-2.5 text-sm"
                  />
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-secondary hover:underline"
                  onClick={() =>
                    setRefundAmount(
                      booking.price != null ? String(booking.price) : "",
                    )
                  }
                >
                  Use full amount
                </button>
                <label className="block text-sm font-medium text-content">
                  Reason <span className="text-red-600">*</span>
                  <textarea
                    rows={3}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 bg-slate-50 px-3 py-2.5 text-sm"
                    placeholder="Why is this refund being issued?"
                  />
                </label>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700"
                  loading={busy === "refund"}
                  disabled={busy !== null && busy !== "refund"}
                  onClick={() => setRefundModalOpen(true)}
                >
                  Process refund
                </Button>
              </div>
            </>
          ) : alreadyRefunded ? (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[#6B7280]">Amount</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-[#111827]">
                  {formatMoney(booking.refund_amount)}
                </dd>
              </div>
              <div>
                <dt className="text-[#6B7280]">Type</dt>
                <dd className="mt-0.5 font-medium capitalize text-[#111827]">
                  {booking.refund_type ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[#6B7280]">Processed</dt>
                <dd className="mt-0.5 font-medium text-[#111827]">
                  {formatWhen(booking.refunded_at)}
                </dd>
              </div>
              <div>
                <dt className="text-[#6B7280]">Processed by</dt>
                <dd className="mt-0.5 font-medium text-[#111827]">
                  {actorLabel(booking.refunded_by)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[#6B7280]">Stripe refund ID</dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-[#111827]">
                  {booking.stripe_refund_id ?? "—"}
                </dd>
              </div>
              {booking.cancellation_reason ? (
                <div className="sm:col-span-2">
                  <dt className="text-[#6B7280]">Reason</dt>
                  <dd className="mt-0.5 text-[#111827]">
                    {booking.cancellation_reason}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[#6B7280]">
              This booking cannot be refunded (payment status:{" "}
              {booking.payment_status}).
            </p>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-secondary" aria-hidden />
              <h2 className="text-lg font-semibold text-[#111827]">Email log</h2>
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              Last 5 transactional emails for this booking
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            loading={busy === "resend"}
            disabled={busy !== null && busy !== "resend"}
            onClick={() => void handleResendConfirmation()}
          >
            Resend confirmation
          </Button>
        </div>

        {booking.email_logs.length === 0 ? (
          <p className="mt-4 text-sm text-[#6B7280]">
            No emails logged yet for this booking.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {booking.email_logs.map((log) => (
              <li key={log.id} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">
                      {formatEmailTypeLabel(log.email_type)}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      {log.email_to}
                      {log.subject ? ` · ${log.subject}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      log.status === "sent"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  Sent {formatWhen(log.created_at)}
                  {log.resend_id ? ` · ${log.resend_id}` : ""}
                </p>
                {log.error_message ? (
                  <p className="mt-1 text-xs text-red-600">{log.error_message}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-secondary" aria-hidden />
              <h2 className="text-lg font-semibold text-[#111827]">SMS log</h2>
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              Pickup reminder texts for this booking
              {booking.sms_reminder_sent_at
                ? ` · scheduled reminder marked ${formatWhen(booking.sms_reminder_sent_at)}`
                : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            loading={busy === "resend-sms"}
            disabled={busy !== null && busy !== "resend-sms"}
            onClick={() => void handleResendSmsReminder()}
          >
            Resend reminder
          </Button>
        </div>

        {booking.sms_logs.length === 0 ? (
          <p className="mt-4 text-sm text-[#6B7280]">
            No SMS logged yet for this booking.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {booking.sms_logs.map((log) => (
              <li key={log.id} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">
                      Pickup reminder
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">{log.phone_to}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      log.status === "sent"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  Sent {formatWhen(log.created_at)}
                  {log.twilio_sid ? ` · ${log.twilio_sid}` : ""}
                </p>
                {log.error_message ? (
                  <p className="mt-1 text-xs text-red-600">{log.error_message}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isDisputed ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-amber-900" aria-hidden />
            <h2 className="text-lg font-semibold text-amber-950">
              Dispute resolution
            </h2>
          </div>
          {booking.dispute_reason ? (
            <p className="mt-2 text-sm text-amber-950/90">
              <span className="font-medium">Customer reason:</span>{" "}
              {booking.dispute_reason}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              loading={busy === "dispute-customer"}
              disabled={busy !== null && busy !== "dispute-customer"}
              onClick={() => {
                if (partialRefundEnabled) {
                  setPartialAmount(
                    booking.price != null ? String(booking.price) : "",
                  );
                  setPartialModalOpen(true);
                } else {
                  void resolveCustomer("full");
                }
              }}
            >
              Resolve — customer wins
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={busy === "dispute-operator"}
              disabled={busy !== null && busy !== "dispute-operator"}
              onClick={() => void resolveOperator()}
            >
              Resolve — operator wins
            </Button>
          </div>
        </section>
      ) : null}

      {(canAdminComplete || canReleasePayout) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-secondary" aria-hidden />
            <h2 className="text-lg font-semibold text-[#111827]">Actions</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canAdminComplete ? (
              <Button
                type="button"
                loading={busy === "complete"}
                onClick={() => void handleComplete()}
              >
                Mark complete
              </Button>
            ) : null}
            {canReleasePayout ? (
              <Button
                type="button"
                variant="secondary"
                loading={busy === "payout"}
                onClick={() => void handleReleasePayout()}
              >
                Release payout early
              </Button>
            ) : null}
          </div>
        </section>
      )}

      {actionSuccess ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {actionSuccess}
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}

      <Modal
        open={refundModalOpen}
        title="Confirm refund"
        onClose={() => setRefundModalOpen(false)}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRefundModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              loading={busy === "refund"}
              onClick={() => void handleProcessRefund()}
            >
              Confirm refund
            </Button>
          </div>
        }
      >
        <p className="text-sm text-content/80">
          Process a{" "}
          {booking.price != null && Number(refundAmount) < booking.price
            ? "partial"
            : "full"}{" "}
          refund of <strong>{formatMoney(Number(refundAmount) || null)}</strong>{" "}
          via Stripe to the customer&apos;s original payment method?
        </p>
        {refundReason.trim() ? (
          <p className="mt-3 text-sm text-content/70">
            Reason: {refundReason.trim()}
          </p>
        ) : null}
      </Modal>

      <Modal
        open={partialModalOpen}
        title="Refund amount"
        onClose={() => setPartialModalOpen(false)}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPartialModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              loading={busy === "dispute-customer"}
              onClick={() => {
                const amount = Number(partialAmount);
                const refundType =
                  booking.price != null && amount < booking.price
                    ? "partial"
                    : "full";
                void resolveCustomer(refundType, amount);
              }}
            >
              Confirm refund & resolve
            </Button>
          </div>
        }
      >
        <p className="text-sm text-content/80">
          Record the refund issued to the customer. Trip price:{" "}
          <strong>{formatMoney(booking.price)}</strong>
        </p>
        <label className="mt-4 block text-sm font-medium text-content">
          Refund amount (£)
          <input
            type="number"
            min={0}
            step={0.01}
            max={booking.price ?? undefined}
            value={partialAmount}
            onChange={(e) => setPartialAmount(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-300 bg-slate-50 px-3 py-2.5 text-sm"
          />
        </label>
        <button
          type="button"
          className="mt-2 text-sm font-medium text-secondary hover:underline"
          onClick={() =>
            setPartialAmount(
              booking.price != null ? String(booking.price) : "",
            )
          }
        >
          Use full amount
        </button>
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[#6B7280]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[#111827]">{value}</dd>
    </div>
  );
}

function FinancialEvent({
  title,
  amount,
  meta,
  badge,
}: {
  title: string;
  amount: string;
  meta?: string;
  badge?: ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-secondary" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[#111827]">{title}</p>
          {badge}
          {amount !== "—" ? (
            <span className="text-sm font-bold tabular-nums text-secondary">
              {amount}
            </span>
          ) : null}
        </div>
        {meta ? (
          <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">{meta}</p>
        ) : null}
      </div>
    </li>
  );
}
