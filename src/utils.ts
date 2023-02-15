export function assert(cond: boolean, msg?: string): void {
  if (!cond) throw new Error(msg);
}

export function uint8ArrayToUnprefixedHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function unprefixedHexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2) {
    hex = "0" + hex;
  }

  const u8 = new Uint8Array(hex.length);

  let i = 0;
  let j = 0;
  while (i < hex.length) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }

  return u8;
}

export function bigintToBits(value: bigint): boolean[] {
  const bits: boolean[] = [];
  while (value > 0n) {
    bits.push((value & 1n) === 1n);
    value >>= 1n;
  }

  return bits;
}
