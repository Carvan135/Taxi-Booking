import { redirect } from "next/navigation";

/** Payment is step 3 of the booking flow on `/book`. */
export default function PaymentPage() {
  redirect("/book");
}
