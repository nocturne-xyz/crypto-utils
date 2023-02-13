import "mocha";
import { expect } from "chai";

import { ZqField } from "ffjavascript";
import { BN254ScalarField } from "../src/field"
import { range, randomFieldElement } from "./utils";

const p = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const CircomF = new ZqField(p);

describe("BN Field", () => {
  it("addition matches ffjavascript", () => {
    range(30).forEach(() => {
      const a = randomFieldElement(BN254ScalarField);
      const b = randomFieldElement(BN254ScalarField);
      const c = CircomF.add(a, b);
      expect(BN254ScalarField.add(a, b)).to.equal(c);
    })
  });

  it("subtraction matches ffjavascript", () => {
    range(30).forEach(() => {
      const a = randomFieldElement(BN254ScalarField);
      const b = randomFieldElement(BN254ScalarField);
      const c = CircomF.sub(a, b);
      expect(BN254ScalarField.sub(a, b)).to.equal(c);
    })
  });

  it("neg matches ffjavascript", () => {
    range(30).forEach(() => {
      const a = randomFieldElement(BN254ScalarField);
      const c = CircomF.neg(a);
      expect(BN254ScalarField.neg(a)).to.equal(c);
    });
  });

  it("multiplication matches ffjavascript", () => {
    range(30).forEach(() => {
      const a = randomFieldElement(BN254ScalarField);
      const b = randomFieldElement(BN254ScalarField);
      const c = CircomF.mul(a, b);
      expect(BN254ScalarField.mul(a, b)).to.equal(c);
    }) 
  });

  it("inv matches ffjavascript", () => {
    range(30).map(_ => randomFieldElement(BN254ScalarField)).filter(elem => elem !== 0n).forEach(a => {
      const c = CircomF.inv(a);
      expect(BN254ScalarField.inv(a)).to.equal(c);
    }) 
  });

  it("invOrZero matches ffjavascript", () => {
    range(30).map(_ => randomFieldElement(BN254ScalarField)).filter(elem => elem !== 0n).forEach(a => {
      const c = CircomF.inv(a);
      expect(BN254ScalarField.inv(a)).to.equal(c);
    }) 
  });

  it("invOrZero returns 0 when given 0 as input", () => {
    expect(BN254ScalarField.invOrZero(0n)).to.equal(0n);
  });

  it("div matches ffjavascript", () => {
    range(30).map(_ => randomFieldElement(BN254ScalarField)).filter(elem => elem !== 0n).forEach(b => {
      const a = randomFieldElement(BN254ScalarField);
      const c = CircomF.div(a, b);
      expect(BN254ScalarField.div(a, b)).to.equal(c);
    }) 
  });

  it("divOrZero matches ffjavascript", () => {
    range(30).map(_ => randomFieldElement(BN254ScalarField)).filter(elem => elem !== 0n).forEach(b => {
      const a = randomFieldElement(BN254ScalarField);
      const c = CircomF.div(a, b);
      expect(BN254ScalarField.divOrZero(a, b)).to.equal(c);
    }) 
  });

  it("divOrZero returns 0 when given 0 as input", () => {
    const a = randomFieldElement(BN254ScalarField);
    expect(BN254ScalarField.divOrZero(a, 0n)).to.equal(0n);
  });

  it("pow matches ffjavascript", () => {
    range(30).forEach(() => {
      const a = randomFieldElement(BN254ScalarField);
      const b = randomFieldElement(BN254ScalarField);
      const c = CircomF.pow(a, b);
      expect(BN254ScalarField.pow(a, b)).to.equal(c);
    }) 
  });

  it("sqrt matches ffjavascript", () => {
    range(30).forEach(() => {
      const a = randomFieldElement(BN254ScalarField);
      const expected = (CircomF.sqrt_old(a) as unknown as bigint | null) ?? undefined;
      const got = BN254ScalarField.sqrt(a);

      if (expected === undefined) {
        expect(got).to.be.undefined;
      } else {
        const neg_expected = CircomF.neg(expected);
        expect(got).to.be.oneOf([expected, neg_expected]);
      }
    })
  });
});
