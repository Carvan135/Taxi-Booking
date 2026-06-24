import type { Booking, Operator, Profile, VehicleType } from "./database";

export type {
  Booking,
  BookingReview,
  BookingLeg,
  BookingStatus,
  BookingType,
  CompletionStatus,
  Notification,
  NotificationStatus,
  NotificationType,
  CreateBookingInput,
  CreatePriceRuleInput,
  Operator,
  OperatorBasePricing,
  OperatorStatus,
  PaymentStatus,
  EmailLog,
  EmailLogStatus,
  PolicyDocument,
  PolicyType,
  RefundType,
  SmsLog,
  SmsLogStatus,
  PlatformSetting,
  PriceRule,
  Profile,
  RuleType,
  ServiceType,
  UpdateOperatorBasePricingInput,
  UpdatePlatformSettingInput,
  UpdatePriceRuleInput,
  UserRole,
  VehicleType,
} from "./database";

/** Customer review left for a completed booking. */
export type BookingReviewSummary = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

/** Operator fields exposed to customers on booking cards. */
export type CustomerBookingOperator = {
  id: string;
  business_name: string;
  vehicle_type: VehicleType;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  business_address: string | null;
  business_description: string | null;
  rating: number;
  total_reviews: number;
};

/** `bookings` row with embedded `operators` from Supabase FK join. */
export type CustomerBookingRow = Booking & {
  operators: CustomerBookingOperator | null;
  review: BookingReviewSummary | null;
};

export type OperatorWithProfile = Operator & { profile: Profile };

export type OperatorBasePricingSummary = {
  base_fare: number;
  per_mile: number;
  per_minute: number;
};

/** Approved operator with optional M2 base pricing row (Step 2 list). */
export type OperatorListItem = Operator & {
  operator_base_pricing: OperatorBasePricingSummary | null;
};

export type BookingWithOperator = Booking & {
  operator: Operator & { profile: Profile };
};
