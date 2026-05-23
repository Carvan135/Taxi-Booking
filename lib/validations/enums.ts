export const SERVICE_TYPES = ["standard", "executive", "van", "suv"] as const;
export const BOOKING_TYPES = ["one_way", "return"] as const;
export const BOOKING_LEGS = ["outbound", "return"] as const;

export type BookingLeg = (typeof BOOKING_LEGS)[number];

export const BOOKING_LEG = {
  outbound: BOOKING_LEGS[0],
  return: BOOKING_LEGS[1],
} as const;
export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Named booking status values for filters and DB writes. */
export const BOOKING_STATUS = {
  pending: BOOKING_STATUSES[0],
  confirmed: BOOKING_STATUSES[1],
  completed: BOOKING_STATUSES[2],
  cancelled: BOOKING_STATUSES[3],
} as const;

/** Upcoming tab: active bookings not yet completed. */
export const UPCOMING_BOOKING_STATUSES: readonly BookingStatus[] = [
  BOOKING_STATUS.pending,
  BOOKING_STATUS.confirmed,
];

/** Completed tab: finished or cancelled bookings. */
export const COMPLETED_BOOKING_STATUSES: readonly BookingStatus[] = [
  BOOKING_STATUS.completed,
  BOOKING_STATUS.cancelled,
];
export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "failed"] as const;
export const RULE_TYPES = ["multiplier", "fixed_fee"] as const;

export const RULE_TYPE = {
  multiplier: RULE_TYPES[0],
  fixed_fee: RULE_TYPES[1],
} as const;
export const OPERATOR_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;

/** Named operator status values for queries (avoids raw string literals). */
export const OPERATOR_STATUS = {
  pending: OPERATOR_STATUSES[0],
  approved: OPERATOR_STATUSES[1],
  rejected: OPERATOR_STATUSES[2],
  suspended: OPERATOR_STATUSES[3],
} as const;
export const USER_ROLES = ["customer", "operator", "admin"] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];
export type BookingType = (typeof BOOKING_TYPES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type RuleType = (typeof RULE_TYPES)[number];
export type OperatorStatus = (typeof OPERATOR_STATUSES)[number];

export const COMPLETION_STATUSES = [
  "none",
  "operator_marked_complete",
  "customer_confirmed",
  "auto_completed",
  "disputed",
] as const;

export const COMPLETION_STATUS = {
  none: COMPLETION_STATUSES[0],
  operator_marked_complete: COMPLETION_STATUSES[1],
  customer_confirmed: COMPLETION_STATUSES[2],
  auto_completed: COMPLETION_STATUSES[3],
  disputed: COMPLETION_STATUSES[4],
} as const;

export const NOTIFICATION_TYPES = [
  "booking_confirmed",
  "operator_assigned",
  "journey_started",
  "operator_marked_complete",
  "completion_confirmed",
  "auto_complete_warning",
  "auto_completed",
  "dispute_raised",
  "dispute_resolved",
  "payout_released",
  "booking_cancelled",
  "stripe_connected",
  "new_booking_assigned",
  "customer_review_received",
] as const;

export const NOTIFICATION_STATUSES = ["unread", "read"] as const;

export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];
