import type { ServiceType } from "@/lib/validations/enums";
import type { VehicleType } from "@/types";

export type BookingPlace = {
  label: string;
  lat: number;
  lng: number;
  isAirport: boolean;
};

export type BookingRoute = {
  distanceMiles: number;
  durationMinutes: number;
};

export type SelectedOperatorSession = {
  operator_id: string;
  business_name: string;
  vehicle_type: VehicleType;
  rating: number;
  total_reviews: number;
  /** Operator subtotal before platform fee (from server quote). */
  operator_subtotal: number;
  /** @deprecated Use operator_subtotal — kept for older sessions. */
  base_fare?: number;
};

export type TaxibookBookingSession = {
  booking_type: "one_way" | "return";
  pickup_address: string;
  dropoff_address: string;
  pickup?: BookingPlace;
  dropoff?: BookingPlace;
  route?: BookingRoute;
  pickup_date: string;
  pickup_time: string;
  passengers: number;
  service_type: ServiceType;
  luggage: number;
  notes?: string;
  return_date?: string;
  return_time?: string;
  selected_operator?: SelectedOperatorSession;
};
