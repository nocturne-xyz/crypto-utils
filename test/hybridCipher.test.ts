import "mocha";
import { expect } from "chai";

import { BabyJubJub } from "../src/algebra/curves";
import { HybridCipher } from "../src/hybrid-encryption";
import { randomBigintModP } from "./utils";

const BABYJUBJUB_WIDE_REDUCTION_ENTROPY = 64;

describe("HybridCipher", () => {
  it("encrypts and decrypts messages", () => {
    const cipher = new HybridCipher(
      BabyJubJub,
      BABYJUBJUB_WIDE_REDUCTION_ENTROPY
    );

    const msg = "Kaizoku o ni ore wa naru!";
    const msgBytes = new TextEncoder().encode(msg);

    const receiverPrivateKey = randomBigintModP(BabyJubJub.ScalarField.Modulus);
    const receiverPublicKey = BabyJubJub.scalarMul(
      BabyJubJub.BasePoint,
      receiverPrivateKey
    );

    const ciphertext = cipher.encrypt(msgBytes, receiverPublicKey);
    const decrypted = cipher.decrypt(ciphertext, receiverPrivateKey);
    expect(decrypted).to.deep.equal(msgBytes);
  });

  it("fails to decrypt ciphertext that has been tampered with", () => {
    const cipher = new HybridCipher(
      BabyJubJub,
      BABYJUBJUB_WIDE_REDUCTION_ENTROPY
    );
    const msg = "Kaizoku o ni ore wa naru!";
    const msgBytes = new TextEncoder().encode(msg);

    const receiverPrivateKey = randomBigintModP(BabyJubJub.ScalarField.Modulus);
    const receiverPublicKey = BabyJubJub.scalarMul(
      BabyJubJub.BasePoint,
      receiverPrivateKey
    );

    const ciphertext = cipher.encrypt(msgBytes, receiverPublicKey);
    ciphertext.ciphertextBytes[0] = (ciphertext.ciphertextBytes[0] + 3) % 8;

    expect(() => cipher.decrypt(ciphertext, receiverPrivateKey)).to.throw(
      "failed to decrypt"
    );
  });
});
