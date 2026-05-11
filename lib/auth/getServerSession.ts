import type { User } from "@supabase/supabase-js";
import { getProfile, getUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types";

export type ServerSession = {
  user: User;
  profile: Profile;
  role: UserRole;
};

/**
 * Server-only session helper for Route Handlers and Server Components.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const supabase = createClient();
  const user = await getUser(supabase);
  if (!user) return null;

  const profile = await getProfile(supabase, user.id);
  if (!profile) return null;

  return { user, profile, role: profile.role };
}
