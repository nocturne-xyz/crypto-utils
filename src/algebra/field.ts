import { assert, bigintToBits } from "../utils";

export interface PrimeField<FieldElement> {
  NumBits: number;
  NumBytes: number;
  Modulus: FieldElement;
  Zero: FieldElement;
  One: FieldElement;
  Two: FieldElement;

  fromBigint(n: bigint): FieldElement;

  // function for deserializing field elements from strings
  // this function need not be "algorithmic constant-time"
  // this function should ensure that the resulting field element is valid and throw an error if the encoding is bad
  fromString(str: string): FieldElement;

  // function for serializing field elements to strings
  // this function need not be "algorithmic constant-time"
  toString(element: FieldElement): string;

  // decodes field element from a byte array in the foramt returned by `toBytes`
  // this function should never throw errors, instead, it should return `null`
  // this function should return `null` if `bytes` has incorrect length or the encoding is "bad"
  // this function should be "algorithmic constat-time" for a fixed length of `bytes`
  fromBytes(bytes: Uint8Array): FieldElement | null;

  // encodes the field element to a fixed length byte array
  // this function must return `Math.ceil(this.NumBits / 0)` bytes
  // this function should be "algorithmic constat-time"
  toBytes(element: FieldElement): Uint8Array;

  // derives a field element from the given `bytes` of entropy
  // this function should be "algorithmic constat-time" for a fixed length of `bytes`l
  fromEntropy(bytes: Uint8Array): FieldElement;

  reduce(lhs: FieldElement): FieldElement;

  eq(lhs: FieldElement, rhs: FieldElement): boolean;
  neq(lhs: FieldElement, rhs: FieldElement): boolean;

  add(lhs: FieldElement, rhs: FieldElement): FieldElement;
  sub(lhs: FieldElement, rhs: FieldElement): FieldElement;
  neg(lhs: FieldElement): FieldElement;

  mul(lhs: FieldElement, rhs: FieldElement): FieldElement;
  div(lhs: FieldElement, rhs: FieldElement): FieldElement;
  divOrZero(lhs: FieldElement, rhs: FieldElement): FieldElement;
  inv(lhs: FieldElement): FieldElement;
  invOrZero(lhs: FieldElement): FieldElement;

  product(...elements: FieldElement[]): FieldElement;
  sum(...elements: FieldElement[]): FieldElement;
  dotProduct(lhs: FieldElement[], rhs: FieldElement[]): FieldElement;

  square(lhs: FieldElement): FieldElement;
  sqrt(lhs: FieldElement): FieldElement | undefined;
  legendreSymbol(lhs: FieldElement): FieldElement;

  pow(base: FieldElement, exp: bigint): FieldElement;
}

export class ZModPField implements PrimeField<bigint> {
  readonly NumBits: number;
  readonly NumBytes: number;
  readonly Modulus: bigint;
  readonly Zero: bigint;
  readonly One: bigint;
  readonly Two: bigint;

  private readonly nonQR: bigint;
  private readonly twoAdicity: bigint;
  private readonly twoAdicSubgroupOrder: bigint;
  private readonly twoAdicSubgroupCofactor: bigint;

  constructor(modulus: bigint, twoAdicity: bigint, nonQR: bigint) {
    this.Modulus = modulus;
    this.NumBits = modulus.toString(2).length;
    this.NumBytes = Math.ceil(this.NumBits / 8);
    this.nonQR = nonQR;

    this.twoAdicity = twoAdicity;
    this.twoAdicSubgroupOrder = 1n << twoAdicity;
    this.twoAdicSubgroupCofactor = (modulus - 1n) / this.twoAdicSubgroupOrder;

    this.Zero = 0n;
    this.One = 1n;
    this.Two = 2n;
  }

  numBits(): number {
    return this.Modulus.toString(2).length;
  }

  fromString(str: string): bigint {
    try {
      return this.reduce(BigInt(str));
    } catch {
      throw new Error(`Invalid string for field element: ${str}`);
    }
  }

  toString(element: bigint): string {
    return this.reduce(element).toString();
  }

  fromBytes(bytes: Uint8Array): bigint | null {
    if (bytes.length !== Math.ceil(this.NumBits / 8)) {
      return null;
    }

    return this.reduceFromLEBytes(bytes);
  }

  fromBigint(n: bigint): bigint {
    return this.reduce(n);
  }

  toBytes(element: bigint): Uint8Array {
    const numBytes = Math.ceil(this.NumBits / 8);
    const bytes = new Uint8Array(numBytes);
    let value = this.reduce(element);
    for (let i = 0; i < numBytes; i++) {
      bytes[i] = Number(value & 0xffn);
      value >>= 8n;
    }

    return bytes;
  }

  fromEntropy(bytes: Uint8Array): bigint {
    return this.reduceFromLEBytes(bytes);
  }

  reduce(lhs: bigint): bigint {
    return ((lhs % this.Modulus) + this.Modulus) % this.Modulus;
  }

  add(lhs: bigint, rhs: bigint): bigint {
    const sum = lhs + rhs;
    const sumOverflow = sum - this.Modulus;
    return sum >= this.Modulus ? sumOverflow : sum;
  }

  sub(lhs: bigint, rhs: bigint): bigint {
    if (lhs >= rhs) {
      return lhs - rhs;
    } else {
      return this.Modulus - rhs + lhs;
    }
  }

  neg(lhs: bigint): bigint {
    return lhs === 0n ? 0n : this.Modulus - lhs;
  }

  mul(lhs: bigint, rhs: bigint): bigint {
    return this.reduce(lhs * rhs);
  }

  square(lhs: bigint): bigint {
    return this.reduce(lhs * lhs);
  }

  eq(lhs: bigint, rhs: bigint): boolean {
    return lhs === rhs;
  }

  neq(lhs: bigint, rhs: bigint): boolean {
    return lhs !== rhs;
  }

  div(lhs: bigint, rhs: bigint): bigint {
    return this.reduce(lhs * this.inv(rhs));
  }

  divOrZero(lhs: bigint, rhs: bigint): bigint {
    return this.reduce(lhs * this.invOrZero(rhs));
  }

  inv(lhs: bigint): bigint {
    assert(lhs !== 0n, "Division by zero");
    return this.invOrZero(lhs);
  }

  invOrZero(lhs: bigint): bigint {
    if (lhs === 0n) {
      return 0n;
    }

    let t = 0n;
    let r = this.Modulus;
    let newt = 1n;
    let newr = lhs;
    while (newr) {
      const q = r / newr;
      [t, newt] = [newt, t - q * newt];
      [r, newr] = [newr, r - q * newr];
    }

    if (t < 0n) t += this.Modulus;

    return t;
  }

  product(...elements: bigint[]): bigint {
    return elements.reduce((acc, el) => this.mul(acc, el), 1n);
  }

  sum(...elements: bigint[]): bigint {
    return elements.reduce((acc, el) => this.add(acc, el), 0n);
  }

  dotProduct(lhs: bigint[], rhs: bigint[]): bigint {
    if (lhs.length !== rhs.length) {
      throw new Error("Vectors must have the same length");
    }

    return lhs.reduce((acc, el, i) => this.add(acc, this.mul(el, rhs[i])), 0n);
  }

  pow(base: bigint, exp: bigint): bigint {
    const exponentBits = bigintToBits(exp);

    let res = 1n;
    for (let i = exponentBits.length - 1; i >= 0; i--) {
      res = this.square(res);
      if (exponentBits[i]) {
        res = this.mul(res, base);
      }
    }

    return res;
  }

  sqrt(lhs: bigint): bigint | undefined {
    const legendre = this.legendreSymbol(lhs);
    switch (legendre) {
      // Legendre symbol is 0 - `this.value` is 0 => sqrt is 0
      case 0n:
        return 0n;
      // Legendre symbol is -1 - `this.value` is a quadratic nonresidue, sqrt does not exist
      case this.Modulus - 1n:
        return undefined;
      // Legendre symbol is 1 - `this.value` is a nonzero quadratic residue, sqrt exists
      // use the Tonelli-Shanks algorithm to compute it
      case 1n:
        let m = this.twoAdicity;
        let c = this.pow(this.nonQR, this.twoAdicSubgroupCofactor);
        let t = this.pow(lhs, this.twoAdicSubgroupCofactor);
        let r = this.pow(lhs, (this.twoAdicSubgroupCofactor + 1n) / 2n);

        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (t === 0n) return 0n;
          if (t === 1n) return r;

          let i = 0n;
          let curr = t;
          while (curr !== 1n) {
            curr = this.square(curr);
            i++;
          }

          // i is guaranteed to be < m if lhs is a quadratic residue.
          // since we already chcked legende symbol, it's guaranteed to be one
          assert(i < m, "unreachable - i >= m");

          const b = this.pow(c, this.pow(2n, this.sub(this.sub(m, i), 1n)));
          m = i;
          c = this.square(b);
          t = this.mul(t, c);
          r = this.mul(r, b);
        }
      default:
        throw new Error(
          `unreachable - Invalid legendre symbol ${legendre} (did you set the correct field parameters?)`
        );
    }
  }

  legendreSymbol(lhs: bigint): bigint {
    return this.pow(lhs, (this.Modulus - 1n) / 2n);
  }

  private reduceFromLEBytes(bytes: Uint8Array): bigint {
    let value = 0n;
    for (let i = 0; i < bytes.length; i++) {
      value |= BigInt(bytes[i]) << BigInt(8 * i);
    }
    return this.reduce(value);
  }
}
