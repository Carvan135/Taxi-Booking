import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/auth";
import { runSmsRemindersCron } from "@/lib/cron/sms-reminders-job";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!authorizeCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const result = await runSmsRemindersCron(supabase);
    return NextResponse.json(result);
  } catch (err) {
    console.error("cron/sms-reminders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
