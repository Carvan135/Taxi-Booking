type ErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

/** Normalize Supabase/Postgrest and other thrown values for API responses. */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }

  if (err && typeof err === "object") {
    const record = err as ErrorLike;
    const parts = [record.message, record.details, record.hint].filter(
      (part): part is string => Boolean(part?.trim()),
    );
    if (parts.length > 0) {
      return parts.join(" — ");
    }
  }

  if (typeof err === "string" && err.trim()) {
    return err.trim();
  }

  return fallback;
}

export function throwAsError(err: unknown, fallback: string): never {
  throw new Error(getErrorMessage(err, fallback));
}
