/** Canonical app origin (no trailing slash). */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    return "https://airporthub.co.uk";
  }
  return "http://localhost:3000";
}
