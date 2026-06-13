import { redirect } from "next/navigation";

/** Legacy path — password reset lives at /auth/reset-password */
export default function LegacyResetPasswordPage() {
  redirect("/auth/reset-password");
}
