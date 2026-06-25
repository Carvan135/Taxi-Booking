import { NextResponse } from "next/server";
import { runSmsRemindersCron } from "@/lib/cron/sms-reminders-job";
import { getRuntimeEnv } from "@/lib/env/runtime";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function authorizeCron(req: Request): boolean {
  const secret = getRuntimeEnv("CRON_SECRET");
  if (!secret) return true;
  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret === secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
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
