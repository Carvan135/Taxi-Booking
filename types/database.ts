export type UserRole = "customer" | "operator" | "admin";

export type OperatorStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type CompletionStatus =
  | "none"
  | "operator_marked_complete"
  | "customer_confirmed"
  | "auto_completed"
  | "disputed";

export type NotificationType =
  | "booking_confirmed"
  | "operator_assigned"
  | "journey_started"
  | "operator_marked_complete"
  | "completion_confirmed"
  | "auto_complete_warning"
  | "auto_completed"
  | "dispute_raised"
  | "dispute_resolved"
  | "payout_released"
  | "booking_cancelled"
  | "stripe_connected"
  | "new_booking_assigned"
  | "customer_review_received";

export type NotificationStatus = "unread" | "read";

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export type BookingType = "one_way" | "return";

export type BookingLeg = "outbound" | "return";

export type ServiceType = "standard" | "executive" | "van" | "suv";

export type RuleType = "multiplier" | "fixed_fee";

export type VehicleType =
  | "Sedan"
  | "SUV"
  | "Luxury"
  | "Van"
  | "Executive";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Operator = {
  id: string;
  user_id: string;
  business_name: string;
  vehicle_type: VehicleType;
  vehicle_registration: string;
  license_number: string;
  license_expiry: string;
  license_document_url: string | null;
  base_price: number;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_payouts_enabled: boolean;
  /** First time Stripe enabled payouts for this connected account */
  stripe_connected_at: string | null;
  is_paused: boolean;
  paused_at: string | null;
  paused_until: string | null;
  status: OperatorStatus;
  rating: number;
  total_reviews: number;
  /** Business / depot address (profile settings) */
  business_address: string | null;
  business_description: string | null;
  fleet_vehicle_count: number;
  fleet_vehicle_types: string | null;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  reference: string;
  customer_id: string | null;
  operator_id: string | null;
  pickup_address: string;
  dropoff_address: string;
  pickup_date: string;
  pickup_time: string;
  passengers: number;
  luggage: number;
  vehicle_type: string | null;
  price: number | null;
  status: BookingStatus;
  stripe_payment_intent_id: string | null;
  payment_status: PaymentStatus;
  notes: string | null;
  booking_type: BookingType;
  group_reference: string | null;
  leg: BookingLeg;
  service_type: ServiceType;
  return_date: string | null;
  return_time: string | null;
  customer_name: string | null;
  customer_email: string;
  customer_phone: string | null;
  platform_commission: number;
  operator_payout: number;
  payout_released_at: string | null;
  payout_eligible_at: string | null;
  completed_at: string | null;
  assigned_at: string | null;
  journey_started_at: string | null;
  completion_status: CompletionStatus;
  completion_requested_at: string | null;
  completion_requested_by: string | null;
  customer_confirmed_at: string | null;
  auto_complete_at: string | null;
  dispute_raised_at: string | null;
  dispute_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  booking_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

export type CreateBookingInput = Omit<
  Booking,
  "id" | "created_at" | "updated_at"
>;

export type PriceRule = {
  id: string;
  operator_id: string;
  rule_key: string;
  name: string;
  description: string | null;
  rule_type: RuleType;
  value: number;
  is_active: boolean;
  time_start: string | null;
  time_end: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatePriceRuleInput = Omit<
  PriceRule,
  "id" | "created_at" | "updated_at"
>;

export type UpdatePriceRuleInput = Partial<
  Omit<CreatePriceRuleInput, "operator_id">
>;

export type OperatorBasePricing = {
  id: string;
  operator_id: string;
  base_fare: number;
  per_mile: number;
  per_minute: number;
  minimum_fare: number;
  updated_at: string;
};

export type UpdateOperatorBasePricingInput = Pick<
  OperatorBasePricing,
  "base_fare" | "per_mile" | "per_minute" | "minimum_fare"
>;

export type PlatformSetting = {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
};

export type BookingReview = {
  id: string;
  booking_id: string;
  customer_id: string;
  operator_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type UpdatePlatformSettingInput = {
  key: string;
  value: string;
};
