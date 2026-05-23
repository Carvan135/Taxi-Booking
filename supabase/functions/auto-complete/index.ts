import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BOOKING_STATUS = {
  completed: "completed",
} as const;

const COMPLETION_STATUS = {
  none: "none",
  operator_marked_complete: "operator_marked_complete",
  auto_completed: "auto_completed",
} as const;

const DEFAULT_PAYOUT_DELAY_HOURS = 24;
const DEFAULT_AUTO_COMPLETE_WARNING_HOURS = 2;

type NotificationType =
  | "auto_completed"
  | "auto_complete_warning"
  | "payout_released";

function addHours(base: Date, hours: number): string {
  return new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.round(parsed);
}

async function getSettingValue(
  supabase: ReturnType<typeof createClient>,
  key: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

function getNotificationContent(
  type: NotificationType,
  data: Record<string, string> = {},
): { title: string; message: string } {
  const map: Record<NotificationType, { title: string; message: string }> = {
    auto_complete_warning: {
      title: "Booking Auto-Completing Soon",
      message: `Booking ${data.reference ?? ""} will be automatically completed in ${data.hours ?? "2"} hours unless you raise a dispute.`,
    },
    auto_completed: {
      title: "Booking Auto-Completed",
      message: `Booking ${data.reference ?? ""} was automatically completed as no response was received.`,
    },
    payout_released: {
      title: "Payout Processing",
      message: `Your payout for booking ${data.reference ?? ""} is now being processed.`,
    },
  };
  return map[type];
}

async function sendNotification(
  supabase: ReturnType<typeof createClient>,
  params: {
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    booking_id?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.user_id,
    type: params.type,
    title: params.title,
    message: params.message,
    booking_id: params.booking_id ?? null,
    metadata: params.metadata ?? {},
    status: "unread",
  });
  if (error) console.error("Failed to send notification:", error);
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase environment" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();
  const nowIso = now.toISOString();

  const warningHours = parsePositiveInt(
    await getSettingValue(supabase, "auto_complete_warning_hours"),
    DEFAULT_AUTO_COMPLETE_WARNING_HOURS,
  );
  const warningDeadline = addHours(now, warningHours);

  let autoCompletedCount = 0;

  const { data: pendingCompletion, error: listError } = await supabase
    .from("bookings")
    .select(
      "id, reference, customer_id, operator_id, auto_complete_at, completion_status",
    )
    .eq("completion_status", COMPLETION_STATUS.operator_marked_complete)
    .is("dispute_raised_at", null)
    .not("auto_complete_at", "is", null);

  if (listError) {
    console.error("auto-complete list error:", listError);
    return new Response(JSON.stringify({ error: listError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  for (const booking of pendingCompletion ?? []) {
    if (!booking.auto_complete_at) continue;
    const autoAt = new Date(booking.auto_complete_at);

    if (autoAt <= now) {
      const payoutDelayHours = parsePositiveInt(
        await getSettingValue(supabase, "payout_delay_hours"),
        DEFAULT_PAYOUT_DELAY_HOURS,
      );
      const payoutEligibleAt = addHours(now, payoutDelayHours);

      const { error } = await supabase
        .from("bookings")
        .update({
          completion_status: COMPLETION_STATUS.auto_completed,
          status: BOOKING_STATUS.completed,
          completed_at: nowIso,
          payout_eligible_at: payoutEligibleAt,
          auto_complete_at: null,
          updated_at: nowIso,
        })
        .eq("id", booking.id);

      if (error) {
        console.error("auto-complete update error:", booking.id, error);
        continue;
      }

      autoCompletedCount += 1;

      if (booking.customer_id) {
        const content = getNotificationContent("auto_completed", {
          reference: booking.reference,
        });
        await sendNotification(supabase, {
          user_id: booking.customer_id,
          type: "auto_completed",
          title: content.title,
          message: content.message,
          booking_id: booking.id,
        });
      }

      if (booking.operator_id) {
        const { data: op } = await supabase
          .from("operators")
          .select("user_id")
          .eq("id", booking.operator_id)
          .maybeSingle();

        if (op?.user_id) {
          const content = getNotificationContent("completion_confirmed", {
            reference: booking.reference,
          });
          await sendNotification(supabase, {
            user_id: op.user_id,
            type: "completion_confirmed",
            title: content.title,
            message: `${content.message} Payout will be processed according to platform settings.`,
            booking_id: booking.id,
          });
        }
      }

      continue;
    }

    if (autoAt <= new Date(warningDeadline) && booking.customer_id) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("type", "auto_complete_warning")
        .eq("user_id", booking.customer_id)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const hoursLeft = Math.max(
        1,
        Math.ceil((autoAt.getTime() - now.getTime()) / (60 * 60 * 1000)),
      );
      const content = getNotificationContent("auto_complete_warning", {
        reference: booking.reference,
        hours: String(hoursLeft),
      });
      await sendNotification(supabase, {
        user_id: booking.customer_id,
        type: "auto_complete_warning",
        title: content.title,
        message: content.message,
        booking_id: booking.id,
        metadata: { warning_sent: true },
      });
    }
  }

  return new Response(JSON.stringify({ processed: autoCompletedCount }), {
    headers: { "Content-Type": "application/json" },
  });
});
