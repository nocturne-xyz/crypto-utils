import { PrimeField } from "./field";
import { bigintToBits, assert, bigintToBitsNum } from "../utils";

export interface AffinePoint<FieldElement> {
  x: FieldElement;
  y: FieldElement;
}

export interface AffineCurve<FieldElement> {
  BaseField: PrimeField<FieldElement>;
  ScalarField: PrimeField<FieldElement>;

  Order: bigint;
  PrimeSubgroupOrder: bigint;
  Cofactor: bigint;

  NumBits: number;
  NumBytes: number;

  Generator: AffinePoint<FieldElement>;
  BasePoint: AffinePoint<FieldElement>;
  Neutral: AffinePoint<FieldElement>;

  // function for serializing points to strings
  // this function need not be "algorithmic constant-time"
  toString(point: AffinePoint<FieldElement>): string;

  // function for deserializing points from strings
  // this function need not be "algorithmic constant-time"
  // this function should ensure that the resulting point is valid and throw an error otherwise
  fromString(str: string): AffinePoint<FieldElement>;

  // encodes the point to a fixed length byte array, formatted as the x-coordinate followed by the y-coordinate
  // where the encoding of `x-coordinate` and `y-coordinate` is that of `BaseField.toBytes`
  // this function should be "algorithmic constat-time" for a fixed length of `bytes`
  toBytes(point: AffinePoint<FieldElement>): Uint8Array;

  // decodes a point from a byte array in the foramt returned by `toBytes`
  // this function should never throw errors, instead, it should return `null`
  // this function should return null if `bytes` is of the incorrect length or if the encoding of any field element is "bad"
  // this function should be "algorithmic constat-time"
  fromBytes(bytes: Uint8Array): AffinePoint<FieldElement> | null;

  eq(lhs: AffinePoint<FieldElement>, rhs: AffinePoint<FieldElement>): boolean;
  neq(lhs: AffinePoint<FieldElement>, rhs: AffinePoint<FieldElement>): boolean;

  isOnCurve(point: AffinePoint<FieldElement>): boolean;
  isInSubgroup(point: AffinePoint<FieldElement>): boolean;

  neg(point: AffinePoint<FieldElement>): AffinePoint<FieldElement>;
  add(
    lhs: AffinePoint<FieldElement>,
    rhs: AffinePoint<FieldElement>
  ): AffinePoint<FieldElement>;
  double(point: AffinePoint<FieldElement>): AffinePoint<FieldElement>;

  scalarMul(
    point: AffinePoint<FieldElement>,
    scalar: bigint
  ): AffinePoint<FieldElement>;
  scalarMulVartime(
    point: AffinePoint<FieldElement>,
    scalar: bigint
  ): AffinePoint<FieldElement>;
}

export class TwistedEdwardsCurve<FieldElement>
  implements AffineCurve<FieldElement>
{
  readonly BaseField: PrimeField<FieldElement>;
  readonly ScalarField: PrimeField<FieldElement>;
  readonly A: FieldElement;
  readonly D: FieldElement;

  readonly Order: bigint;
  readonly PrimeSubgroupOrder: bigint;
  readonly Cofactor: bigint;
  readonly Generator: AffinePoint<FieldElement>;
  readonly BasePoint: AffinePoint<FieldElement>;
  readonly Neutral: AffinePoint<FieldElement>;

  NumBits: number;
  NumBytes: number;

  constructor(
    baseField: PrimeField<FieldElement>,
    scalarField: PrimeField<FieldElement>,
    order: bigint,
    cofactor: bigint,
    generator: AffinePoint<FieldElement>,
    basePoint: AffinePoint<FieldElement>,
    a: FieldElement,
    d: FieldElement
  ) {
    this.BaseField = baseField;
    this.ScalarField = scalarField;

    this.Order = order;
    this.PrimeSubgroupOrder = order / cofactor;
    this.Cofactor = cofactor;
    assert(
      cofactor * this.PrimeSubgroupOrder === order,
      "cofactor * primeSubgroupOrder != order"
    );

    this.Generator = generator;
    this.BasePoint = basePoint;
    this.Neutral = {
      x: this.BaseField.Zero,
      y: this.BaseField.One,
    };

    this.A = a;
    this.D = d;

    this.NumBits = this.BaseField.NumBits * 2;
    this.NumBytes = Math.ceil(this.NumBits / 8);
  }

  toString(point: AffinePoint<FieldElement>): string {
    const { x, y } = point;
    return JSON.stringify({
      x: this.BaseField.toString(x),
      y: this.BaseField.toString(y),
    });
  }

  fromString(str: string): AffinePoint<FieldElement> {
    const parsed = JSON.parse(str);
    assert(parsed !== undefined, "invalid serialized point");
    assert(parsed.x !== undefined, "invalid serialized point");
    assert(parsed.y !== undefined, "invalid serialized point");
    assert(typeof parsed.x === "string", "invalid serialized point");
    assert(typeof parsed.y === "string", "invalid serialized point");

    const x = this.BaseField.fromString(parsed.x);
    const y = this.BaseField.fromString(parsed.y);

    const point = { x, y };

    assert(this.isOnCurve(point), "point not on curve");

    return { x, y };
  }

  // serializes a point to bytes as the `x` coordinate followed by the `y` coordinate
  toBytes(point: AffinePoint<FieldElement>): Uint8Array {
    const { x, y } = point;

    const xBytes = this.BaseField.toBytes(x);
    const yBytes = this.BaseField.toBytes(y);

    const res = new Uint8Array(this.NumBytes);
    res.set(xBytes);
    res.set(yBytes, xBytes.length);

    return res;
  }

  // this function will return `null` if `bytes` is incorrect length
  // this function
  // this function will return `null` if the resulting point is not on the curve
  fromBytes(bytes: Uint8Array): AffinePoint<FieldElement> | null {
    if (bytes.length !== this.NumBytes) {
      return null;
    }

    const xBytes = bytes.slice(0, this.BaseField.NumBytes);
    const yBytes = bytes.slice(this.BaseField.NumBytes);

    const x = this.BaseField.fromBytes(xBytes);
    const y = this.BaseField.fromBytes(yBytes);

    if (x === null || y === null || !this.isOnCurve({ x, y })) {
      return null;
    }

    return { x, y };
  }

  eq(lhs: AffinePoint<FieldElement>, rhs: AffinePoint<FieldElement>): boolean {
    return this.BaseField.eq(lhs.x, rhs.x) && this.BaseField.eq(lhs.y, rhs.y);
  }

  neq(lhs: AffinePoint<FieldElement>, rhs: AffinePoint<FieldElement>): boolean {
    return !this.eq(lhs, rhs);
  }

  isOnCurve(point: AffinePoint<FieldElement>): boolean {
    const F = this.BaseField;

    const { x, y } = point;

    const xSquared = F.square(x);
    const ySquared = F.square(y);

    return F.eq(
      F.add(F.mul(this.A, xSquared), ySquared),
      F.add(F.One, F.product(xSquared, ySquared, this.D))
    );
  }

  isInSubgroup(point: AffinePoint<FieldElement>): boolean {
    if (!this.isOnCurve(point)) return false;

    const shouldBeNeutral = this.scalarMul(point, this.PrimeSubgroupOrder);
    return this.eq(shouldBeNeutral, this.Neutral);
  }

  neg(point: AffinePoint<FieldElement>): AffinePoint<FieldElement> {
    const { x, y } = point;
    return { x, y: this.BaseField.neg(y) };
  }

  // using formula from https://en.wikipedia.org/wiki/Twisted_Edwards_curve
  add(
    lhs: AffinePoint<FieldElement>,
    rhs: AffinePoint<FieldElement>
  ): AffinePoint<FieldElement> {
    const F = this.BaseField;

    const { x: x1, y: y1 } = lhs;
    const { x: x2, y: y2 } = rhs;

    const x1y2 = F.mul(x1, y2);
    const x2y1 = F.mul(x2, y1);
    const dx1x2y1y2 = F.product(this.D, x1y2, x2y1);

    const xNum = F.add(x1y2, x2y1);
    const xDenom = F.add(F.One, dx1x2y1y2);
    const x = F.div(xNum, xDenom);

    const yNum = F.sub(F.mul(y1, y2), F.product(this.A, x1, x2));
    const yDenom = F.sub(F.One, dx1x2y1y2);
    const y = F.div(yNum, yDenom);

    return { x, y };
  }

  // using formula from https://en.wikipedia.org/wiki/Twisted_Edwards_curve
  double(point: AffinePoint<FieldElement>): AffinePoint<FieldElement> {
    const F = this.BaseField;

    const { x, y } = point;

    const axSquared = F.mul(this.A, F.square(x));
    const ySquared = F.square(y);

    const xNum = F.product(F.Two, x, y);
    const xDenom = F.add(axSquared, ySquared);
    const xNew = F.div(xNum, xDenom);

    const yNum = F.sub(ySquared, axSquared);
    const yDenom = F.sub(F.sub(F.Two, axSquared), ySquared);
    const yNew = F.div(yNum, yDenom);

    return { x: xNew, y: yNew };
  }

  // double-always-add method from https://www.hyperelliptic.org/tanja/teaching/crypto21/ecc-8.pdf
  scalarMul(
    point: AffinePoint<FieldElement>,
    scalar: bigint
  ): AffinePoint<FieldElement> {
    const scalarBits = bigintToBitsNum(scalar);

    let res = this.Neutral;
    for (let i = scalarBits.length - 1; i >= 0; i--) {
      res = this.double(res);
      const q = this.add(res, point);

      res = this.sel(scalarBits[i], q, res);
    }

    return res;
  }

  // double-and-add method
  // optimize later if needed
  scalarMulVartime(
    point: AffinePoint<FieldElement>,
    scalar: bigint
  ): AffinePoint<FieldElement> {
    const scalarBits = bigintToBits(scalar);

    let res = this.Neutral;
    for (let i = scalarBits.length - 1; i >= 0; i--) {
      res = this.double(res);
      if (scalarBits[i]) {
        res = this.add(res, point);
      }
    }

    return res;
  }

  // return a if bit is 0, b if 1
  // caller must ensure that bit is 0 or 1
  private sel(
    bit: number,
    a: AffinePoint<FieldElement>,
    b: AffinePoint<FieldElement>
  ): AffinePoint<FieldElement> {
    const s = this.BaseField.fromBigint(BigInt(bit));

    return {
      x: this.BaseField.add(
        this.BaseField.mul(a.x, s),
        this.BaseField.mul(b.x, this.BaseField.sub(this.BaseField.One, s))
      ),
      y: this.BaseField.add(
        this.BaseField.mul(a.y, s),
        this.BaseField.mul(b.y, this.BaseField.sub(this.BaseField.One, s))
      ),
    };
  }
}
