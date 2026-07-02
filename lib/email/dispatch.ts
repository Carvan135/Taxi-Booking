import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadBookingEmailSnapshotByReference,
  loadBookingEmailSnapshotsForPaymentIntent,
  resolveProfileEmail,
  type BookingEmailSnapshot,
} from "@/lib/email/booking-context";
import {
  legToBookingEmailData,
  snapshotToBookingEmailData,
} from "@/lib/email/map-booking-email-data";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  bookingConfirmationEmail,
  cancellationConfirmationEmail,
  completionRequestEmail,
  operatorNewBookingEmail,
  refundConfirmationEmail,
  tripUpdateEmail,
} from "@/lib/email/templates";
import { getAppUrl } from "@/lib/env/app-url";
import { agentLog } from "@/lib/debug/agent-log";
import { getNotificationContent } from "@/lib/notifications/messages";
import type { NotificationType } from "@/lib/validations/enums";

function bookingLookupUrl(reference: string, email: string): string {
  const appUrl = getAppUrl().replace(/\/$/, "");
  const params = new URLSearchParams({ ref: reference, email });
  return `${appUrl}/bookings/lookup?${params.toString()}`;
}

async function sendToCustomerEmail(
  to: string,
  emailType: string,
  bookingId: string | null,
  userId: string | null,
  payload: {
    subject: string;
    html: string;
    text?: string;
    attachments?: { filename: string; content: Buffer }[];
  },
): Promise<void> {
  const result = await sendTransactionalEmail({
    to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    attachments: payload.attachments,
    email_type: emailType,
    booking_id: bookingId,
    user_id: userId,
  });

  agentLog({
    location: "dispatch.ts:sendToCustomerEmail:result",
    message: "transactional email result",
    data: {
      emailType,
      sent: result.sent,
      hasError: Boolean(result.error),
      errorMsg: result.error ?? null,
    },
    hypothesisId: "H-C",
    runId: "post-fix",
  });

  if (result.error) {
    console.error("Customer email failed:", result.error);
  }
}

export async function sendBookingConfirmationEmails(
  supabase: SupabaseClient,
  paymentIntentId: string,
): Promise<void> {
  const snapshots = await loadBookingEmailSnapshotsForPaymentIntent(
    supabase,
    paymentIntentId,
  );

  const sentEmails = new Set<string>();
  for (const snapshot of snapshots) {
    const email = snapshot.customer_email.trim().toLowerCase();
    if (!email || sentEmails.has(email)) continue;
    sentEmails.add(email);

    const { data: row } = await supabase
      .from("bookings")
      .select("id, customer_id")
      .eq("id", snapshot.booking_id)
      .maybeSingle();

    const bookingId = row?.id ?? snapshot.booking_id;

    const data = snapshotToBookingEmailData(snapshot);
    const payload = bookingConfirmationEmail(data);

    await sendToCustomerEmail(
      email,
      "booking_confirmation",
      (row?.id as string | undefined) ?? bookingId ?? null,
      (row?.customer_id as string | undefined) ?? null,
      payload,
    );
  }
}

export async function sendBookingConfirmationEmailForReference(
  supabase: SupabaseClient,
  reference: string,
): Promise<{ sent: boolean; error?: string }> {
  const snapshot = await loadBookingEmailSnapshotByReference(supabase, reference);
  if (!snapshot?.customer_email) {
    return { sent: false, error: "Booking not found" };
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id")
    .eq("reference", reference)
    .maybeSingle();

  const data = snapshotToBookingEmailData(snapshot);
  const payload = bookingConfirmationEmail(data);

  const result = await sendTransactionalEmail({
    to: snapshot.customer_email,
    ...payload,
    email_type: "booking_confirmation",
    booking_id: booking?.id ?? null,
    user_id: (booking?.customer_id as string | undefined) ?? null,
  });
  return { sent: result.sent, error: result.error };
}

export async function sendRefundConfirmationEmail(
  supabase: SupabaseClient,
  input: {
    bookingId: string;
    reference: string;
    amount: number;
    refundType: string;
    email: string;
    customerId?: string | null;
  },
): Promise<void> {
  const payload = refundConfirmationEmail({
    reference: input.reference,
    amount: input.amount,
    refundType: input.refundType,
    email: input.email,
  });

  await sendToCustomerEmail(
    input.email,
    "refund_confirmation",
    input.bookingId,
    input.customerId ?? null,
    payload,
  );
}

type CustomerTripEmailType = Extract<
  NotificationType,
  | "journey_started"
  | "operator_marked_complete"
  | "auto_complete_warning"
  | "auto_completed"
  | "dispute_raised"
  | "dispute_resolved"
  | "booking_cancelled"
>;

export async function sendCustomerTripEmail(
  supabase: SupabaseClient,
  input: {
    bookingId: string;
    reference: string;
    customerEmail?: string | null;
    customerId?: string | null;
    customerName?: string | null;
    type: CustomerTripEmailType;
    data?: Record<string, string>;
  },
): Promise<void> {
  let email = input.customerEmail?.trim() ?? "";
  if (!email && input.customerId) {
    email = (await resolveProfileEmail(supabase, input.customerId)) ?? "";
  }

  agentLog({
    location: "dispatch.ts:sendCustomerTripEmail:entry",
    message: "resolved recipient",
    data: {
      type: input.type,
      hasEmail: Boolean(email),
      resolvedViaProfile:
        !Boolean(input.customerEmail?.trim()) && Boolean(input.customerId),
    },
    hypothesisId: "H-A",
    runId: "post-fix",
  });

  if (!email) return;

  if (input.type === "operator_marked_complete") {
    const snapshot = await loadBookingEmailSnapshotByReference(
      supabase,
      input.reference,
    );

    agentLog({
      location: "dispatch.ts:sendCustomerTripEmail:snapshot",
      message: "snapshot lookup for completion email",
      data: {
        hasSnapshot: Boolean(snapshot),
        referenceLen: input.reference?.length ?? 0,
      },
      hypothesisId: "H-B",
      runId: "post-fix",
    });

    if (snapshot) {
      const bookingData = snapshotToBookingEmailData(snapshot);
      const hours = Number(input.data?.hours ?? "24");
      const payload = completionRequestEmail({
        ...bookingData,
        autoCompleteHours: Number.isFinite(hours) ? hours : 24,
      });
      await sendToCustomerEmail(
        email,
        input.type,
        input.bookingId,
        input.customerId ?? null,
        payload,
      );

      agentLog({
        location: "dispatch.ts:sendCustomerTripEmail:completion-template",
        message: "sent completionRequestEmail path",
        data: { emailType: input.type },
        hypothesisId: "H-B",
        runId: "post-fix",
      });

      return;
    }
  }

  if (input.type === "booking_cancelled") {
    const refundRaw = input.data?.refund_amount;
    const refundAmount =
      refundRaw != null && refundRaw !== ""
        ? Number(refundRaw)
        : undefined;
    const payload = cancellationConfirmationEmail({
      reference: input.reference,
      email,
      refundAmount:
        refundAmount != null && Number.isFinite(refundAmount)
          ? refundAmount
          : undefined,
    });
    await sendToCustomerEmail(
      email,
      input.type,
      input.bookingId,
      input.customerId ?? null,
      payload,
    );
    return;
  }

  const content = getNotificationContent(input.type, {
    reference: input.reference,
    ...input.data,
  });

  const lookupUrl = bookingLookupUrl(input.reference, email);
  const payload = tripUpdateEmail({
    title: content.title,
    message: content.message,
    reference: input.reference,
    customerName: input.customerName,
    actionLabel: "View your booking",
    actionHref: lookupUrl,
  });

  await sendToCustomerEmail(
    email,
    input.type,
    input.bookingId,
    input.customerId ?? null,
    payload,
  );

  agentLog({
    location: "dispatch.ts:sendCustomerTripEmail:fallback",
    message: "sent tripUpdateEmail fallback path",
    data: { emailType: input.type },
    hypothesisId: "H-B",
    runId: "post-fix",
  });
}

export async function sendOperatorTripEmail(
  supabase: SupabaseClient,
  input: {
    operatorId: string;
    bookingId?: string | null;
    type: Extract<
      NotificationType,
      | "new_booking_assigned"
      | "dispute_raised"
      | "dispute_resolved"
      | "customer_review_received"
    >;
    reference: string;
    data?: Record<string, string>;
  },
): Promise<void> {
  const { data: op } = await supabase
    .from("operators")
    .select(
      "user_id, business_name, profiles!operators_user_id_fkey ( full_name )",
    )
    .eq("id", input.operatorId)
    .maybeSingle();

  if (!op?.user_id) return;

  const profileEmail = await resolveProfileEmail(supabase, op.user_id);
  if (!profileEmail) return;

  if (input.type === "new_booking_assigned") {
    const snapshot = await loadBookingEmailSnapshotByReference(
      supabase,
      input.reference,
    );
    if (snapshot) {
      const legData = legToBookingEmailData(snapshot, input.reference);
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
      const result = await sendTransactionalEmail({
        to: profileEmail,
        ...payload,
        email_type: input.type,
        booking_id: input.bookingId ?? null,
        user_id: op.user_id,
      });
      if (result.error) {
        console.error("Operator email failed:", result.error);
      }
      return;
    }
  }

  const content = getNotificationContent(input.type, {
    reference: input.reference,
    ...input.data,
  });

  const appUrl = getAppUrl().replace(/\/$/, "");
  const payload = tripUpdateEmail({
    title: content.title,
    message: content.message,
    reference: input.reference,
    actionLabel: "View booking",
    actionHref: `${appUrl}/operator/bookings`,
  });

  const result = await sendTransactionalEmail({
    to: profileEmail,
    ...payload,
    email_type: input.type,
    booking_id: input.bookingId ?? null,
    user_id: op.user_id,
  });
  if (result.error) {
    console.error("Operator email failed:", result.error);
  }
}

export type { BookingEmailSnapshot };
