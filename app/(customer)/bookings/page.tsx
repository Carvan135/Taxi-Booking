import { BookingsTabsList } from "@/components/booking/BookingsTabsList";
import { fetchCustomerBookings } from "@/lib/booking/fetch-customer-bookings";

export default async function CustomerBookingsPage() {
  const bookings = await fetchCustomerBookings();

  return <BookingsTabsList bookings={bookings} enableManageActions />;
}
