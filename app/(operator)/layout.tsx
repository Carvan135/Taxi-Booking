import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  await requireRole(supabase, ["operator"]);

  return <DashboardShell variant="operator">{children}</DashboardShell>;
}
