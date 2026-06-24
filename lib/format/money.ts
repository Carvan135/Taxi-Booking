import { PLACEHOLDER } from "@/lib/format/display";

export function formatGbp(
  amount: number | null | undefined,
  options?: { decimals?: number },
): string {
  if (amount == null || Number.isNaN(Number(amount))) return PLACEHOLDER;

  const decimals = options?.decimals ?? 2;
  return `£${Number(amount).toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
