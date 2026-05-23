import {
  BOOKING_STATUS,
  PAYMENT_STATUSES,
  type BookingLeg,
  type BookingStatus,
  type BookingType,
  type ServiceType,
} from "@/lib/validations/enums";

const PAYMENT_PAID = PAYMENT_STATUSES[1];
import type { CustomerBookingRow } from "@/types";
import type { VehicleType } from "@/types";

type LookupLeg = {
  id: string;
  reference: string;
  leg: BookingLeg;
  pickup_address: string;
  dropoff_address: string;
  pickup_date: string;
  pickup_time: string;
  passengers: number;
  service_type: ServiceType;
  price: number | null;
  status?: BookingStatus;
  created_at?: string;
  booking_type?: BookingType;
  group_reference?: string | null;
  operator?: {
    id: string;
    business_name: string;
    vehicle_type: string;
    email: string | null;
    phone: string | null;
    contact_name?: string | null;
    business_address?: string | null;
    business_description?: string | null;
    rating?: number;
    total_reviews?: number;
  } | null;
};

type LookupApiResponse = {
  reference: string;
  group_reference: string | null;
  booking_type: BookingType;
  customer_email: string;
  legs: LookupLeg[];
};

export function mapLookupResponseToBookings(
  data: LookupApiResponse,
): CustomerBookingRow[] {
  return data.legs.map((leg) => {
    const op = leg.operator;
    return {
      id: leg.id,
      reference: leg.reference,
      customer_id: null,
      operator_id: null,
      pickup_address: leg.pickup_address,
      dropoff_address: leg.dropoff_address,
      pickup_date: leg.pickup_date,
      pickup_time: leg.pickup_time,
      passengers: leg.passengers,
      vehicle_type: op?.vehicle_type ?? null,
      price: leg.price,
      status: leg.status ?? BOOKING_STATUS.confirmed,
      stripe_payment_intent_id: null,
      payment_status: PAYMENT_PAID,
      notes: null,
      booking_type: leg.booking_type ?? data.booking_type,
      group_reference: leg.group_reference ?? data.group_reference,
      leg: leg.leg,
      service_type: leg.service_type,
      return_date: null,
      return_time: null,
      customer_name: null,
      customer_email: data.customer_email,
      customer_phone: null,
      platform_commission: 0,
      operator_payout: 0,
      payout_released_at: null,
      payout_eligible_at: null,
      completed_at: null,
      assigned_at: null,
      journey_started_at: null,
      language: "english",
      completion_status: "none",
      completion_requested_at: null,
      completion_requested_by: null,
      customer_confirmed_at: null,
      auto_complete_at: null,
      dispute_raised_at: null,
      dispute_reason: null,
      created_at: leg.created_at ?? new Date().toISOString(),
      updated_at: leg.created_at ?? new Date().toISOString(),
      operators: op
        ? {
            id: op.id,
            business_name: op.business_name,
            vehicle_type: op.vehicle_type as VehicleType,
            email: op.email,
            phone: op.phone,
            contact_name: op.contact_name ?? null,
            business_address: op.business_address ?? null,
            business_description: op.business_description ?? null,
            rating: Number(op.rating ?? 0),
            total_reviews: Number(op.total_reviews ?? 0),
          }
        : null,
      review: null,
    };
  });
}
