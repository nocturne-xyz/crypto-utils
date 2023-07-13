import "./crypto";
import { PrimeField } from "../src/algebra/field";
import { randomBytes } from "crypto";

export function range(start: number, stop?: number, step?: number): number[] {
  if (!stop) {
    stop = start;
    start = 0;
  }

  step = step ?? 1;

  return Array(Math.ceil((stop - start) / step))
    .fill(start)
    .map((x, i) => x + i * (step as number));
}

export function randomFieldElement<FieldElement>(
  F: PrimeField<FieldElement>
): FieldElement {
  const numBytes = (F.NumBits + 7) / 8;
  const bytes = randomBytes(numBytes);
  return F.fromEntropy(bytes);
}

export function randomBigintModP(p: bigint): bigint {
  const numBytes = (p.toString(2).length + 7) / 8;
  const bytes = randomBytes(numBytes);
  return BigInt("0x" + bytes.toString("hex")) % p;
}
