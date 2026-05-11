import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { getDashboardPathForRole } from "@/lib/auth/routes";
import type { Profile, UserRole } from "@/types";

export async function getUser(
  supabase: SupabaseClient,
): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

export async function getUserRole(
  supabase: SupabaseClient,
): Promise<UserRole | null> {
  const user = await getUser(supabase);
  if (!user) return null;
  const profile = await getProfile(supabase, user.id);
  return profile?.role ?? null;
}

export async function requireRole(
  supabase: SupabaseClient,
  role: UserRole | UserRole[],
): Promise<{ user: User; profile: Profile }> {
  const user = await getUser(supabase);
  if (!user) redirect("/login");

  const profile = await getProfile(supabase, user.id);
  if (!profile) redirect("/login");

  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(profile.role)) {
    redirect(getDashboardPathForRole(profile.role));
  }

  return { user, profile };
}
