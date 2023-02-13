import { uint8ArrayToHex } from "./utils";

export type FieldElement = bigint;

export const BN254ScalarField = makeField(
  21888242871839275222246405745257275088548364400416034343698204186575808495617n,
  28n,
  5n
);

export const BabyJubjubScalarField = BN254ScalarField;

export interface Field {
  numBits(): number;
  fromBytes(bytes: Uint8Array): FieldElement;

  zero(): FieldElement;
  one(): FieldElement;

  reduce(lhs: bigint): FieldElement;

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

  square(lhs: FieldElement): FieldElement;
  sqrt(lhs: FieldElement): FieldElement | undefined;
  legendreSymbol(lhs: FieldElement): FieldElement;

  toBits(lhs: FieldElement): boolean[];
  pow(base: FieldElement, exp: bigint): FieldElement;
}

export function makeField(
  modulus: bigint,
  twoAdicity: bigint,
  nonQR: bigint
): Field {
  const twoAdicSubgroupOrder = 1n << twoAdicity;
  const twoAdicSubgroupCofactor = (modulus - 1n) / twoAdicSubgroupOrder;

  return {
    numBits(): number{
      return modulus.toString(2).length;
    },

    fromBytes(bytes: Uint8Array): FieldElement {
      const nonCanonical = BigInt("0x" + uint8ArrayToHex(bytes));
      return this.reduce(nonCanonical);
    },

    zero(): FieldElement {
      return 0n;
    },

    one(): FieldElement {
      return 1n;
    },

    reduce(lhs: bigint): FieldElement {
      return lhs % modulus;
    },

    add(lhs: FieldElement, rhs: FieldElement): FieldElement {
      const sum = lhs + rhs;
      const sumOverflow = sum - modulus;
      return sum >= modulus ? sumOverflow : sum;
    },

    sub(lhs: FieldElement, rhs: FieldElement): FieldElement {
      if (lhs >= rhs) {
        return lhs - rhs;
      } else {
        return modulus - rhs + lhs;
      }
    },

    neg(lhs: FieldElement): FieldElement {
      return lhs === 0n ? 0n : modulus - lhs;
    },

    mul(lhs: FieldElement, rhs: FieldElement): FieldElement {
      return (lhs * rhs) % modulus;
    },

    square(lhs: FieldElement): FieldElement {
      return (lhs * lhs) % modulus;
    },

    eq(lhs: FieldElement, rhs: FieldElement): boolean {
      return lhs === rhs;
    },

    neq(lhs: FieldElement, rhs: FieldElement): boolean {
      return lhs !== rhs;
    },

    div(lhs: FieldElement, rhs: FieldElement): FieldElement {
      return (lhs * this.inv(rhs)) % modulus;
    },

    divOrZero(lhs: FieldElement, rhs: FieldElement): FieldElement {
      return (lhs * this.invOrZero(rhs)) % modulus;
    },

    inv(lhs: FieldElement): FieldElement {
      if (lhs === 0n) {
        throw new Error("Division by zero");
      }

      return this.invOrZero(lhs);
    },

    invOrZero(lhs: FieldElement): FieldElement {
      if (lhs === 0n) {
        return 0n;
      }

      let t = 0n;
      let r = modulus;
      let newt = 1n;
      let newr = lhs;
      while (newr) {
        const q = r / newr;
        [t, newt] = [newt, t - q * newt];
        [r, newr] = [newr, r - q * newr];
      }

      if (t < 0n) t += modulus;

      return t;
    },

    toBits(lhs: FieldElement): boolean[] {
      let bits: boolean[] = [];
      let value = lhs;
      while (value > 0n) {
        bits.push((value & 1n) === 1n);
        value >>= 1n;
      }

      return bits;
    },

    pow(base: FieldElement, exp: bigint): FieldElement {
      const exponentBits = this.toBits(exp);

      let res = 1n;
      for (let i = exponentBits.length - 1; i >= 0; i--) {
        res = this.square(res);
        if (exponentBits[i]) {
          res = this.mul(res, base);
        }
      }

      return res;
    },

    sqrt(lhs: FieldElement): FieldElement | undefined {
      const legendre = this.legendreSymbol(lhs);
      switch (legendre) {
        // Legendre symbol is 0 - `this.value` is 0 => sqrt is 0
        case 0n:
          return 0n;
        // Legendre symbol is -1 - `this.value` is a quadratic nonresidue, sqrt does not exist
        case modulus - 1n:
          return undefined;
        // Legendre symbol is 1 - `this.value` is a nonzero quadratic residue, sqrt exists
        // use tonelli-shanks algorithm to compute it
        case 1n:
          let m = twoAdicity;
          let c = this.pow(nonQR, twoAdicSubgroupCofactor);
          let t = this.pow(lhs, twoAdicSubgroupCofactor);
          let r = this.pow(lhs, (twoAdicSubgroupCofactor + 1n) / 2n);

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
            // and its guaranteed to be one since we already chcked legende symbol
            if (i >= m) throw new Error("unreachable - i >= m");

            let b = this.pow(c, this.pow(2n, (this.sub(this.sub(m, i), 1n))));
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
    },

    legendreSymbol(lhs: FieldElement): bigint {
      return this.pow(lhs, (modulus - 1n) / 2n);
    },
  };
}
