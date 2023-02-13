export function assert(cond: boolean, msg?: string): void {
  if (!cond) throw new Error(msg);
}

export function uint8ArrayToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function bigintToBits(value: bigint): boolean[] {
  const bits: boolean[] = [];
  while (value > 0n) {
    bits.push((value & 1n) === 1n);
    value >>= 1n;
  }

  return bits;
}
