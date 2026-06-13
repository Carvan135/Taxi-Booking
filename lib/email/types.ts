export type BookingEmailData = {
  reference: string;
  customer_name: string;
  customer_email: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_date: string;
  pickup_time: string;
  service_type: string;
  passengers: number;
  operator_name: string;
  vehicle_type: string;
  price: number;
  platform_commission: number;
  booking_type: "one_way" | "return";
  return_date?: string;
  return_time?: string;
  app_url: string;
};

/** Optional return-leg addresses when booking_type is return. */
export type BookingEmailReturnLeg = {
  return_pickup_address?: string;
  return_dropoff_address?: string;
};
