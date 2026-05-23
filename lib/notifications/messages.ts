import type { NotificationType } from "@/lib/validations/enums";

export type NotificationContent = { title: string; message: string };

export function getNotificationContent(
  type: NotificationType,
  data: Record<string, string> = {},
): NotificationContent {
  const map: Record<NotificationType, NotificationContent> = {
    booking_confirmed: {
      title: "Booking Confirmed",
      message: `Your booking ${data.reference ?? ""} has been confirmed.`,
    },
    operator_assigned: {
      title: "Operator Assigned",
      message: `${data.operator_name ?? "An operator"} has been assigned to your booking ${data.reference ?? ""}.`,
    },
    journey_started: {
      title: "Your driver is on the way",
      message: `Your driver has started the journey for booking ${data.reference ?? ""}. Enjoy your journey!`,
    },
    operator_marked_complete: {
      title: "Ride Marked as Complete",
      message: `Your operator has marked booking ${data.reference ?? ""} as delivered. Please confirm or raise a dispute within ${data.hours ?? "24"} hours.`,
    },
    completion_confirmed: {
      title: "Booking Completed",
      message: `Booking ${data.reference ?? ""} has been completed. Payout will be processed according to platform settings.`,
    },
    auto_complete_warning: {
      title: "Booking Auto-Completing Soon",
      message: `Booking ${data.reference ?? ""} will be automatically completed in ${data.hours ?? "2"} hours unless you raise a dispute.`,
    },
    auto_completed: {
      title: "Booking Auto-Completed",
      message: `Booking ${data.reference ?? ""} was automatically completed as no response was received.`,
    },
    dispute_raised: {
      title: "Dispute Raised",
      message: `A dispute has been raised for booking ${data.reference ?? ""}. Our team will review it shortly.`,
    },
    dispute_resolved: {
      title: "Dispute Resolved",
      message: `The dispute for booking ${data.reference ?? ""} has been resolved.`,
    },
    payout_released: {
      title: "Payout Processing",
      message: `Your payout for booking ${data.reference ?? ""} is now being processed.`,
    },
    booking_cancelled: {
      title: "Booking Cancelled",
      message: `Booking ${data.reference ?? ""} has been cancelled.`,
    },
    stripe_connected: {
      title: "Stripe Account Connected",
      message:
        "Your bank account has been connected. You can now receive payouts.",
    },
    new_booking_assigned: {
      title: "New Booking Assigned",
      message: `A new booking ${data.reference ?? ""} has been assigned to you for ${data.pickup_date ?? "your schedule"}.`,
    },
    customer_review_received: {
      title: "New customer review",
      message: `You received a ${data.rating ?? ""}-star review for booking ${data.reference ?? ""}.${data.has_comment === "true" ? " The customer left a comment." : ""}`,
    },
  };
  return map[type];
}
