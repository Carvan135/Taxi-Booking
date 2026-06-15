import { getEmailFrom, getResendClient } from "@/lib/email/client";
import { isEmailConfigured } from "@/lib/email/config";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
  booking_id?: string | null;
  user_id?: string | null;
  email_type: string;
};

export type SendEmailResult = {
  success: boolean;
  id?: string;
  error?: string;
};

async function recordEmailAttempt(
  params: SendEmailParams,
  outcome: {
    status: "sent" | "failed";
    resendId?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("email_logs").insert({
      booking_id: params.booking_id ?? null,
      user_id: params.user_id ?? null,
      email_to: params.to,
      email_type: params.email_type,
      subject: params.subject,
      status: outcome.status,
      resend_id: outcome.resendId ?? null,
      error_message: outcome.errorMessage ?? null,
    });
    if (error) {
      console.error("email_logs insert failed:", error);
    }
  } catch (logErr) {
    console.error("email_logs insert error:", logErr);
  }
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    const message = "Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)";
    await recordEmailAttempt(params, {
      status: "failed",
      errorMessage: message,
    });
    return { success: false, error: message };
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from: getEmailFrom(),
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      attachments: params.attachments,
    });

    await recordEmailAttempt(params, {
      status: error ? "failed" : "sent",
      resendId: data?.id ?? null,
      errorMessage: error?.message ?? null,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email";
    console.error("Email send error:", err);

    await recordEmailAttempt(params, {
      status: "failed",
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}

export type SendTransactionalEmailParams = Omit<SendEmailParams, "to"> & {
  to: string | string[];
};

export type SendTransactionalEmailResult = {
  sent: boolean;
  error?: string;
  resendId?: string;
};

/** Sends to one or more recipients; each attempt is logged separately. */
export async function sendTransactionalEmail(
  params: SendTransactionalEmailParams,
): Promise<SendTransactionalEmailResult> {
  const recipients = (Array.isArray(params.to) ? params.to : [params.to])
    .map((email) => email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { sent: false, error: "No recipient" };
  }

  let lastId: string | undefined;
  let lastError: string | undefined;
  let anySuccess = false;

  for (const to of recipients) {
    const result = await sendEmail({
      to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      attachments: params.attachments,
      booking_id: params.booking_id,
      user_id: params.user_id,
      email_type: params.email_type,
    });

    if (result.success) {
      anySuccess = true;
      lastId = result.id;
    } else {
      lastError = result.error;
    }
  }

  if (anySuccess) return { sent: true, resendId: lastId };
  return { sent: false, error: lastError ?? "Failed to send email" };
}
