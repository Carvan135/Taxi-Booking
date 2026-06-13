import { NextResponse } from "next/server";
import { z } from "zod";
import { passwordResetEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { getAppUrl } from "@/lib/env/app-url";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email(),
});

/**
 * Generates a Supabase recovery link and sends branded email via Resend.
 * Always returns success — never reveals whether the email exists.
 */
export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ success: true });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const supabase = createServiceRoleClient();
    const redirectTo = `${getAppUrl()}/auth/reset-password`;

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ success: true });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("email", email)
      .maybeSingle();

    const payload = passwordResetEmail({
      resetUrl: linkData.properties.action_link,
      name: profile?.full_name ?? undefined,
    });

    try {
      await sendEmail({
        to: email,
        subject: payload.subject,
        html: payload.html,
        email_type: "password_reset",
        user_id: profile?.id ?? null,
      });
    } catch (emailErr) {
      console.error("send-reset-email Resend error:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-reset-email error:", err);
    return NextResponse.json({ success: true });
  }
}
