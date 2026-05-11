import type { z } from "zod";

export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  return first
    ? `${first.path.join(".") || "field"}: ${first.message}`
    : "Validation failed";
}
