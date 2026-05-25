export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

/** Supabase URL + anon key for browser/middleware/server session (not service role). */
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabasePublicEnvConfigured(): boolean {
  return getSupabasePublicEnv() !== null;
}
