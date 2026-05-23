"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  mapCustomerBookingRow,
  type BookingRowWithOperator,
} from "@/lib/booking/map-customer-booking-row";
import { CUSTOMER_BOOKING_LIST_SELECT } from "@/lib/booking/customer-booking-select";
import type {
  Booking,
  CreateBookingInput,
  CustomerBookingRow,
} from "@/types";
import { bookingKeys } from "./keys";

const DEFAULT_STALE_TIME = 1000 * 60;

export function useBooking(bookingId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: bookingKeys.detail(bookingId),
    queryFn: async (): Promise<Booking | null> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      if (error) throw error;
      return data as Booking | null;
    },
    enabled: Boolean(bookingId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useGuestBooking(bookingId: string, email: string) {
  const supabase = createClient();
  const normalizedEmail = email.trim().toLowerCase();

  return useQuery({
    queryKey: bookingKeys.guest(bookingId, normalizedEmail),
    queryFn: async (): Promise<Booking | null> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .ilike("customer_email", normalizedEmail)
        .is("customer_id", null)
        .maybeSingle();

      if (error) throw error;
      return data as Booking | null;
    },
    enabled: Boolean(bookingId && normalizedEmail),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useMyBookings() {
  const supabase = createClient();

  return useQuery({
    queryKey: bookingKeys.customer,
    queryFn: async (): Promise<CustomerBookingRow[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select(CUSTOMER_BOOKING_LIST_SELECT)
        .eq("customer_id", user.id)
        .order("pickup_date", { ascending: false })
        .order("pickup_time", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((row) =>
        mapCustomerBookingRow(row as BookingRowWithOperator),
      );
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useCreateBooking() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBookingInput): Promise<Booking> => {
      const { data, error } = await supabase
        .from("bookings")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.customer });
      void queryClient.invalidateQueries({
        queryKey: bookingKeys.detail(data.id),
      });
    },
  });
}
