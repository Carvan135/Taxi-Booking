import { Sidebar } from "@/components/layout/Sidebar";
import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  await requireRole(supabase, ["operator"]);

  return (
    <div className="flex min-h-screen bg-accent">
      <Sidebar variant="operator" />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
