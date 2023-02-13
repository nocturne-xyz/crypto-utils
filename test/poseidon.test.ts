import "mocha";
import { expect } from "chai";

import { poseidon } from "circomlibjs";
import { poseidonBN } from "../src/poseidonBnScalar";
import { BN254ScalarField } from "../src/field";
import { randomFieldElement, range } from "./utils";

describe("Poseidon", () => {
  it("matches circomlibjs with 1 input", () => {
    range(30).map(_ => range(1).map(_ => randomFieldElement(BN254ScalarField))).forEach(inputs => {
      const c = poseidon(inputs);
      expect(poseidonBN(inputs)).to.equal(c);
    });
  });

  it("matches circomlibjs with 2 inputs", () => {
    range(30).map(_ => range(2).map(_ => randomFieldElement(BN254ScalarField))).forEach(inputs => {
      const c = poseidon(inputs);
      expect(poseidonBN(inputs)).to.equal(c);
    });
  });

  it("matches circomlibjs with 3 inputs", () => {
    range(30).map(_ => range(3).map(_ => randomFieldElement(BN254ScalarField))).forEach(inputs => {
      const c = poseidon(inputs);
      expect(poseidonBN(inputs)).to.equal(c);
    });
  });

  it("matches circomlibjs with 6 inputs", () => {
    range(30).map(_ => range(6).map(_ => randomFieldElement(BN254ScalarField))).forEach(inputs => {
      const c = poseidon(inputs);
      expect(poseidonBN(inputs)).to.equal(c);
    });
  });

  it("matches circomlibjs with 15 inputs", () => {
    range(30).map(_ => range(15).map(_ => randomFieldElement(BN254ScalarField))).forEach(inputs => {
      const c = poseidon(inputs);
      expect(poseidonBN(inputs)).to.equal(c);
    });
  });
});