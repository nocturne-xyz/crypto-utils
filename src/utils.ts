export function assert(cond: boolean, msg?: string) {
  if (!cond) throw new Error(msg);
}

export function uint8ArrayToHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("")
}
