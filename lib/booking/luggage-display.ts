/** Maximum luggage pieces selectable at booking. */
export const MAX_BOOKING_LUGGAGE = 10;

export function formatBookingLuggage(
  count: number | null | undefined,
): string {
  const n = count ?? 0;
  if (n <= 0) return "None";
  if (n === 1) return "1 piece";
  return `${n} pieces`;
}
