import { redirect } from "next/navigation";
import { getProfile, getUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const user = await getUser(supabase);

  if (user) {
    const profile = await getProfile(supabase, user.id);
    if (!profile) {
      redirect("/");
    }
    if (profile.role === "operator") {
      redirect("/operator/dashboard");
    }
    if (profile.role === "admin") {
      redirect("/admin/dashboard");
    }
    redirect("/bookings");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-100 to-white">
      {children}
    </div>
  );
}
