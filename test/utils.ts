import * as crypto from "crypto";
import { Field, FieldElement } from "../src/field";

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

export function randomFieldElement(F: Field): FieldElement {
  const numBytes = (F.numBits() + 7) / 8;
  const bytes = crypto.randomBytes(numBytes);
  return F.fromBytes(bytes);
}