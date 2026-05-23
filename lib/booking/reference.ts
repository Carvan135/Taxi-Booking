import { customAlphabet } from "nanoid";

const refAlphabet = customAlphabet(
  "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ",
  8,
);

export function generateBookingReference(): string {
  return `TB-${refAlphabet().toUpperCase()}`;
}

export function generateGroupReference(): string {
  return `GRP-${refAlphabet().toUpperCase()}`;
}
