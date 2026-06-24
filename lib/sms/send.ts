import { getTwilioClient, getTwilioFrom } from "@/lib/sms/client";
import { isSmsConfigured } from "@/lib/sms/config";
import { toE164UkPhone } from "@/lib/sms/phone";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type SendSmsParams = {
  to: string;
  message: string;
  booking_id?: string;
};

export type SendSmsResult = {
  success: boolean;
  error?: string;
};

async function recordSmsAttempt(
  params: SendSmsParams,
  outcome: {
    status: "sent" | "failed";
    twilioSid?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("sms_logs").insert({
      booking_id: params.booking_id ?? null,
      phone_to: params.to,
      message: params.message,
      status: outcome.status,
      twilio_sid: outcome.twilioSid ?? null,
      error_message: outcome.errorMessage ?? null,
    });
    if (error) {
      console.error("sms_logs insert failed:", error);
    }
  } catch (logErr) {
    console.error("sms_logs insert error:", logErr);
  }
}

export async function sendSMS(params: SendSmsParams): Promise<SendSmsResult> {
  const e164 = toE164UkPhone(params.to);
  if (!e164) {
    const message = "Invalid phone number";
    await recordSmsAttempt(params, {
      status: "failed",
      errorMessage: message,
    });
    return { success: false, error: message };
  }

  if (!isSmsConfigured()) {
    const message =
      "SMS is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER)";
    await recordSmsAttempt(
      { ...params, to: e164 },
      { status: "failed", errorMessage: message },
    );
    return { success: false, error: message };
  }

  try {
    const result = await getTwilioClient().messages.create({
      body: params.message,
      from: getTwilioFrom(),
      to: e164,
    });

    await recordSmsAttempt(
      { ...params, to: e164 },
      { status: "sent", twilioSid: result.sid },
    );

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send SMS";
    console.error("SMS send error:", err);

    await recordSmsAttempt(
      { ...params, to: e164 },
      { status: "failed", errorMessage: message },
    );

    return { success: false, error: message };
  }
}
