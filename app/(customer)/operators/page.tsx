import { redirect } from "next/navigation";

/** Operator selection is part of the booking wizard on `/book`. */
export default function CustomerOperatorsPage() {
  redirect("/book");
}
