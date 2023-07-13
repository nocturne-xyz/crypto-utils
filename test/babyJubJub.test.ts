import "mocha";
import { expect } from "chai";
import "./crypto";

//@ts-ignore
import { babyjub } from "circomlibjs";

import { BabyJubJub } from "../src/algebra/curves";
import { AffinePoint } from "../src/algebra/curve";
import { randomBigintModP, range } from "./utils";

function randomSubgroupPoint(): AffinePoint<bigint> {
  const scalar = randomBigintModP(BabyJubJub.PrimeSubgroupOrder);
  return BabyJubJub.scalarMul(BabyJubJub.BasePoint, scalar);
}

describe("BabyJubJub", () => {
  it("Order matches circomlibjs", () => {
    expect(BabyJubJub.Order).to.equal(babyjub.order);
  });

  it("PrimeSubgroupOrder matches circomlibjs", () => {
    expect(BabyJubJub.PrimeSubgroupOrder).to.equal(babyjub.subOrder);
  });

  it("Generator matches circomlibjs", () => {
    expect(BabyJubJub.Generator.x).to.equal(babyjub.Generator[0]);
    expect(BabyJubJub.Generator.y).to.equal(babyjub.Generator[1]);
  });

  it("BasePoint matches circomlibjs", () => {
    expect(BabyJubJub.BasePoint.x).to.equal(babyjub.Base8[0]);
    expect(BabyJubJub.BasePoint.y).to.equal(babyjub.Base8[1]);
  });

  it("A matches circomlibjs", () => {
    expect(BabyJubJub.A).to.equal(babyjub.A);
  });

  it("D matches circomlibjs", () => {
    expect(BabyJubJub.D).to.equal(babyjub.D);
  });

  it("add matches circomlibjs", () => {
    range(10).forEach(() => {
      const a = randomSubgroupPoint();
      const b = randomSubgroupPoint();

      const aCircom = [a.x, a.y];
      const bCircom = [b.x, b.y];

      const expected = babyjub.addPoint(aCircom, bCircom);
      const got = BabyJubJub.add(a, b);
      expect(got.x).to.equal(expected[0]);
      expect(got.y).to.equal(expected[1]);
    });
  });

  it("double matches circomlibjs", () => {
    range(10).forEach(() => {
      const point = randomSubgroupPoint();
      const pointCircom = [point.x, point.y];

      const expected = babyjub.addPoint(pointCircom, pointCircom);
      const got = BabyJubJub.double(point);

      expect(got.x).to.equal(expected[0]);
      expect(got.y).to.equal(expected[1]);
    });
  });

  it("scalarMul matches circomlibjs", () => {
    range(10).forEach(() => {
      const point = randomSubgroupPoint();
      const pointCircom = [point.x, point.y];

      const scalar = randomBigintModP(BabyJubJub.PrimeSubgroupOrder);

      const expected = babyjub.mulPointEscalar(pointCircom, scalar);
      const got = BabyJubJub.scalarMul(point, scalar);

      expect(got.x).to.equal(expected[0]);
      expect(got.y).to.equal(expected[1]);
    });
  });

  it("scalarMulVartime matches circomlibjs", () => {
    range(10).forEach(() => {
      const point = randomSubgroupPoint();
      const pointCircom = [point.x, point.y];

      const scalar = randomBigintModP(BabyJubJub.PrimeSubgroupOrder);

      const expected = babyjub.mulPointEscalar(pointCircom, scalar);
      const got = BabyJubJub.scalarMulVartime(point, scalar);

      expect(got.x).to.equal(expected[0]);
      expect(got.y).to.equal(expected[1]);
    });
  });

  it("toString matches fromString", () => {
    range(10).forEach(() => {
      const point = randomSubgroupPoint();

      const pointString = BabyJubJub.toString(point);
      const got = BabyJubJub.fromString(pointString);
      expect(got.x).to.equal(point.x);
      expect(got.y).to.equal(point.y);
    });
  });
});
