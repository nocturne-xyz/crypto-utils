export function assert(cond: boolean, msg?: string): void {
  if (!cond) throw new Error(msg);
}

export function uint8ArrayToUnprefixedHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function unprefixedHexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    hex = "0" + hex;
  }

  const u8 = new Uint8Array(hex.length / 2);

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

export function bigintToBitsNum(value: bigint): number[] {
  const bits: number[] = [];
  while (value > 0n) {
    bits.push(Number(value & 1n));
    value >>= 1n;
  }

  return bits;
}

// RFC 3447 - compliant I2OSP
// converts a non-negative bigint to a big-endian byte string of length `length`
export function i2osp(n: bigint, length: number): Uint8Array {
  if (n < 0n) {
    throw new Error("i2osp: input must be non-negative");
  }

  if (n > 256 ** length) {
    throw new Error(
      "i2osp: input too large to encode into a byte array of specified length"
    );
  }

  const bytes = new Uint8Array(length);

  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(n & 0xffn);
    n >>= 8n;
  }

  return bytes;
}
