import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadBookingEmailSnapshotByReference,
  resolveProfileEmail,
} from "@/lib/email/booking-context";
import {
  legToBookingEmailData,
  snapshotToBookingEmailData,
} from "@/lib/email/map-booking-email-data";
import { sendEmail } from "@/lib/email/send";
import {
  bookingConfirmationEmail,
  bookingReceiptEmail,
  cancellationConfirmationEmail,
  completionRequestEmail,
  operatorNewBookingEmail,
  refundConfirmationEmail,
} from "@/lib/email/templates";
import { generateReceiptBuffer } from "@/lib/pdf/generateReceipt";
import { loadReceiptBookingById } from "@/lib/pdf/load-receipt-booking";

/** Fire-and-forget — never blocks the caller. */
export function fireBookingEmail(task: () => Promise<void>): void {
  void task().catch((err) => {
    console.error("Booking email error:", err);
  });
}

export async function wasEmailSent(
  supabase: SupabaseClient,
  bookingId: string,
  emailType: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("email_logs")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("email_type", emailType)
    .eq("status", "sent")
    .limit(1);

  if (error) {
    console.error("email_logs lookup failed:", error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

async function loadBookingMeta(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<{ customer_id: string | null } | null> {
  const { data } = await supabase
    .from("bookings")
    .select("customer_id")
    .eq("id", bookingId)
    .maybeSingle();
  return data ?? null;
}

/**
 * After a paid booking is created — one confirmation email (return = both legs),
 * plus one operator email per assigned operator.
 */
export async function emitBookingCreatedEmails(
  supabase: SupabaseClient,
  primaryReference: string,
): Promise<void> {
  const snapshot = await loadBookingEmailSnapshotByReference(
    supabase,
    primaryReference,
  );
  if (!snapshot?.customer_email) {
    console.warn(
      "booking confirmation email skipped: no snapshot for reference",
      primaryReference,
    );
    return;
  }

  const customerEmail = snapshot.customer_email.trim();
  if (!customerEmail) return;

  const meta = await loadBookingMeta(supabase, snapshot.booking_id);
  const data = snapshotToBookingEmailData(snapshot);
  const confirmation = bookingConfirmationEmail(data);

  if (!(await wasEmailSent(supabase, snapshot.booking_id, "booking_confirmation"))) {
    await sendEmail({
      to: customerEmail,
      subject: confirmation.subject,
      html: confirmation.html,
      email_type: "booking_confirmation",
      booking_id: snapshot.booking_id,
      user_id: meta?.customer_id ?? null,
    });
  }

  const seenOperators = new Set<string>();
  for (const leg of snapshot.legs) {
    const { data: row } = await supabase
      .from("bookings")
      .select("id, operator_id")
      .eq("reference", leg.reference)
      .maybeSingle();

    if (!row?.operator_id || seenOperators.has(row.operator_id)) continue;
    seenOperators.add(row.operator_id);

    const operatorEmailType = "new_booking_assigned";
    if (await wasEmailSent(supabase, row.id, operatorEmailType)) continue;

    const { data: op } = await supabase
      .from("operators")
      .select(
        "user_id, business_name, profiles!operators_user_id_fkey ( full_name )",
      )
      .eq("id", row.operator_id)
      .maybeSingle();

    if (!op?.user_id) continue;

    const profileEmail = await resolveProfileEmail(supabase, op.user_id);
    if (!profileEmail) continue;

    const legData = legToBookingEmailData(snapshot, leg.reference);
    const profile = op.profiles as { full_name?: string | null } | null;
    const operatorName =
      profile?.full_name?.trim() ||
      (op.business_name as string) ||
      "there";

    const payload = operatorNewBookingEmail({
      ...legData,
      operatorName,
      customer_phone: snapshot.customer_phone,
    });

    await sendEmail({
      to: profileEmail,
      subject: payload.subject,
      html: payload.html,
      email_type: operatorEmailType,
      booking_id: row.id,
      user_id: op.user_id,
    });
  }
}

/** Stripe webhook safety net — skip if confirmation already logged. */
export async function emitBookingConfirmationSafetyNet(
  supabase: SupabaseClient,
  paymentIntentId: string,
): Promise<void> {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, reference")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .order("created_at", { ascending: true });

  if (!bookings?.length) return;

  const primary =
    bookings.find((b) => b.reference) ?? bookings[0];
  if (!primary?.reference) return;

  if (await wasEmailSent(supabase, primary.id, "booking_confirmation")) {
    return;
  }

  await emitBookingCreatedEmails(supabase, primary.reference);
}

export async function emitCompletionRequestEmail(
  supabase: SupabaseClient,
  input: {
    bookingId: string;
    reference: string;
    customerEmail: string;
    customerId?: string | null;
    autoCompleteHours: number;
  },
): Promise<void> {
  const snapshot = await loadBookingEmailSnapshotByReference(
    supabase,
    input.reference,
  );
  if (!snapshot) return;

  const email = input.customerEmail.trim();
  if (!email) return;

  const bookingData = snapshotToBookingEmailData(snapshot);
  const payload = completionRequestEmail({
    ...bookingData,
    autoCompleteHours: input.autoCompleteHours,
  });

  await sendEmail({
    to: email,
    subject: payload.subject,
    html: payload.html,
    email_type: "operator_marked_complete",
    booking_id: input.bookingId,
    user_id: input.customerId ?? null,
  });
}

export async function emitBookingReceiptEmail(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<void> {
  if (await wasEmailSent(supabase, bookingId, "booking_receipt")) {
    return;
  }

  const receiptBooking = await loadReceiptBookingById(supabase, bookingId);
  if (!receiptBooking) return;

  const email = receiptBooking.customer_email?.trim();
  if (!email) return;

  const snapshot = await loadBookingEmailSnapshotByReference(
    supabase,
    receiptBooking.reference,
  );
  if (!snapshot) return;

  const receiptData = snapshotToBookingEmailData(snapshot);
  const payload = bookingReceiptEmail(receiptData);
  const pdfBuffer = await generateReceiptBuffer(receiptBooking);

  await sendEmail({
    to: email,
    subject: payload.subject,
    html: payload.html,
    email_type: "booking_receipt",
    booking_id: bookingId,
    user_id: receiptBooking.customer_id,
    attachments: [
      {
        filename: `receipt-${receiptBooking.reference}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}

export async function emitCancellationConfirmationEmail(
  supabase: SupabaseClient,
  input: {
    bookingId: string;
    reference: string;
    email: string;
    customerId?: string | null;
    refundAmount?: number;
  },
): Promise<void> {
  const payload = cancellationConfirmationEmail({
    reference: input.reference,
    email: input.email,
    refundAmount: input.refundAmount,
  });

  await sendEmail({
    to: input.email,
    subject: payload.subject,
    html: payload.html,
    email_type: "booking_cancelled",
    booking_id: input.bookingId,
    user_id: input.customerId ?? null,
  });
}

export async function emitRefundConfirmationEmail(
  supabase: SupabaseClient,
  input: {
    bookingId: string;
    reference: string;
    email: string;
    amount: number;
    refundType: string;
    customerId?: string | null;
  },
): Promise<void> {
  const payload = refundConfirmationEmail({
    reference: input.reference,
    amount: input.amount,
    refundType: input.refundType,
    email: input.email,
  });

  await sendEmail({
    to: input.email,
    subject: payload.subject,
    html: payload.html,
    email_type: "refund_confirmation",
    booking_id: input.bookingId,
    user_id: input.customerId ?? null,
  });
}

/** Admin resend — always sends and logs, even if a prior confirmation exists. */
export async function emitResendBookingConfirmationEmail(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: booking, error: readError } = await supabase
    .from("bookings")
    .select("id, reference, customer_email, customer_id, payment_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (readError || !booking?.reference) {
    return { success: false, error: "Booking not found." };
  }

  const email = booking.customer_email?.trim();
  if (!email) {
    return { success: false, error: "No customer email on this booking." };
  }

  const snapshot = await loadBookingEmailSnapshotByReference(
    supabase,
    booking.reference,
  );
  if (!snapshot) {
    return { success: false, error: "Could not load booking email data." };
  }

  const data = snapshotToBookingEmailData(snapshot);
  const confirmation = bookingConfirmationEmail(data);

  const result = await sendEmail({
    to: email,
    subject: confirmation.subject,
    html: confirmation.html,
    email_type: "booking_confirmation",
    booking_id: bookingId,
    user_id: booking.customer_id,
  });

  if (!result.success) {
    return { success: false, error: result.error ?? "Failed to send email." };
  }

  return { success: true };
}
