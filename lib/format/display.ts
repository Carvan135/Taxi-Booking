/** Shown when a value is missing (avoid em dash in UI). */
export const PLACEHOLDER = "N/A";

export function orPlaceholder(
  value: string | null | undefined,
  fallback: string = PLACEHOLDER,
): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}
