import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  await requireRole(supabase, ["admin"]);

  return <DashboardShell variant="admin">{children}</DashboardShell>;
}
