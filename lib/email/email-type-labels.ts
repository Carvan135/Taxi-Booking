const LABELS: Record<string, string> = {
  booking_confirmation: "Booking confirmation",
  booking_receipt: "Payment receipt",
  refund_confirmation: "Refund confirmation",
  password_reset: "Password reset",
  new_booking_assigned: "Operator — new booking",
  operator_marked_complete: "Completion request",
  journey_started: "Journey started",
  auto_complete_warning: "Auto-complete warning",
  auto_completed: "Auto-completed",
  dispute_raised: "Dispute raised",
  dispute_resolved: "Dispute resolved",
  booking_cancelled: "Cancellation",
  customer_review_received: "Customer review",
};

export function formatEmailTypeLabel(emailType: string): string {
  return (
    LABELS[emailType] ??
    emailType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
