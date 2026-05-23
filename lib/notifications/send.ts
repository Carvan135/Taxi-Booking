import { createServiceRoleClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/validations/enums";

export type SendNotificationParams = {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  booking_id?: string;
  metadata?: Record<string, unknown>;
};

export async function sendNotification(
  params: SendNotificationParams,
): Promise<void> {
  const supabase = createServiceRoleClient();
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

export async function sendNotificationToMultiple(
  user_ids: string[],
  params: Omit<SendNotificationParams, "user_id">,
): Promise<void> {
  if (user_ids.length === 0) return;
  const supabase = createServiceRoleClient();
  const rows = user_ids.map((user_id) => ({
    user_id,
    type: params.type,
    title: params.title,
    message: params.message,
    booking_id: params.booking_id ?? null,
    metadata: params.metadata ?? {},
    status: "unread" as const,
  }));
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) console.error("Failed to send notifications:", error);
}

export async function fetchAdminUserIds(): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  if (error) {
    console.error("Failed to fetch admin ids:", error);
    return [];
  }
  return (data ?? []).map((r) => r.id as string);
}
