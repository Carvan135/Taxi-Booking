const REF_CHARS = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomToken(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += REF_CHARS[bytes[i]! % REF_CHARS.length]!;
  }
  return out;
}

export function generateBookingReference(): string {
  return `TB-${randomToken(8)}`;
}

export function generateGroupReference(): string {
  return `GRP-${randomToken(8)}`;
}
