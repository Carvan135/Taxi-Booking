import { Navbar } from "@/components/layout/Navbar";
import { requireRole } from "@/lib/auth/helpers";
import { getServerSession } from "@/lib/auth/getServerSession";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  await requireRole(supabase, ["customer"]);

  const serverSession = await getServerSession();
  const navbarSession = serverSession
    ? {
        displayName:
          serverSession.profile.full_name?.trim() ||
          serverSession.profile.email ||
          "Account",
        role: serverSession.role,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-accent">
      <Navbar variant="public" session={navbarSession} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
