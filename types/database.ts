export type UserRole = "customer" | "operator" | "admin";

export type OperatorStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "operator_assigned"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "refunded";

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
  customer_id: string;
  operator_id: string | null;
  pickup_address: string;
  dropoff_address: string;
  pickup_date: string;
  pickup_time: string;
  passengers: number;
  vehicle_type: string | null;
  price: number | null;
  status: BookingStatus;
  stripe_payment_intent_id: string | null;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
