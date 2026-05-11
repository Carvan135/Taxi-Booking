import { redirect } from "next/navigation";

/** Customers use My Bookings as their home; `/dashboard` is kept for old links. */
export default function CustomerDashboardRedirect() {
  redirect("/bookings");
}
