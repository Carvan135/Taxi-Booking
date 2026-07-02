import { createClient } from "@/lib/supabase/server";

type BookingAccessRow = {
  customer_id: string | null;
  customer_email: string | null;
};

export type CustomerBookingAccess =
  | { ok: true; userId: string | null }
  | { ok: false; status: 401 | 403; error: string };

export type BookingReferenceAccess =
  | { ok: true }
  | { ok: false; status: 403 | 404; error: string };

/** Lookup by reference + email (confirmation, receipts) without requiring sign-in. */
export function verifyBookingReferenceAccess(
  booking: BookingAccessRow,
  options: { userId: string | null; email?: string | null },
): BookingReferenceAccess {
  const bookingEmail = booking.customer_email?.trim().toLowerCase() ?? "";
  const emailInput = options.email?.trim().toLowerCase();

  if (options.userId) {
    if (booking.customer_id && booking.customer_id !== options.userId) {
      return { ok: false, status: 404, error: "Booking not found" };
    }
    return { ok: true };
  }

  if (emailInput) {
    if (!bookingEmail || emailInput !== bookingEmail) {
      return { ok: false, status: 404, error: "Booking not found" };
    }
    return { ok: true };
  }

  if (booking.customer_id) {
    return {
      ok: false,
      status: 403,
      error: "Sign in to view this booking",
    };
  }

  return {
    ok: false,
    status: 403,
    error: "Email is required to view this booking",
  };
}

/** Verify a logged-in customer or guest (email) may act on a booking. */
export async function verifyCustomerBookingAccess(
  booking: BookingAccessRow,
  customerEmailFromBody?: string | null,
): Promise<CustomerBookingAccess> {
  const authClient = createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const bookingEmail = booking.customer_email?.trim().toLowerCase() ?? "";

  if (user) {
    if (booking.customer_id) {
      if (booking.customer_id !== user.id) {
        return { ok: false, status: 403, error: "Forbidden" };
      }
      return { ok: true, userId: user.id };
    }

    const emailInput = customerEmailFromBody?.trim().toLowerCase();
    if (!emailInput || emailInput !== bookingEmail) {
      return {
        ok: false,
        status: 403,
        error: "Enter the email used when you booked",
      };
    }

    return { ok: true, userId: user.id };
  }

  const emailInput = customerEmailFromBody?.trim().toLowerCase();
  if (!emailInput || emailInput !== bookingEmail) {
    return {
      ok: false,
      status: 403,
      error: "Enter the email used when you booked",
    };
  }

  return { ok: true, userId: null };
}
