import type { Booking, Operator, Profile } from "./database";

export type {
  Booking,
  BookingStatus,
  Operator,
  OperatorStatus,
  PaymentStatus,
  Profile,
  UserRole,
  VehicleType,
} from "./database";

export type OperatorWithProfile = Operator & { profile: Profile };

export type BookingWithOperator = Booking & {
  operator: Operator & { profile: Profile };
};
