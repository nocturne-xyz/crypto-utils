// a Nocturne-specific hybrid encryption scheme that requires the sender to prove knowledge of the ephemeral secret key
// see [TODO] for a detailed spec and security argument

import { sha256 } from "@noble/hashes/sha256";
import { expand, extract } from "@noble/hashes/hkdf";
import { AffineCurve, AffinePoint } from "../algebra";
import {
  ChaCha20Poly1305,
  KEY_LENGTH,
  NONCE_LENGTH,
} from "@stablelib/chacha20poly1305";
import crypto from "crypto";
import { HPKEKDF, deriveBaseNonce } from "./nonceDerivation";

export interface HybridCiphertext {
  ciphertextBytes: Uint8Array;
  encapsulatedSecretBytes: Uint8Array;
}

export const HKDF_SHA256: HPKEKDF = {
  extract: (ikm: Uint8Array, salt?: Uint8Array) =>
    extract(sha256, ikm, salt),
  expand: (prk: Uint8Array, outputLen: number, info?: Uint8Array) =>
    expand(sha256, prk, info, outputLen),
};

export class HybridCipher {
  protected curve: AffineCurve<bigint>;
  protected ephemeralSecretEntropyNumBytes: number;

  // curve is the elliptic curve to use for encryption
  // ephemeralSecretEntropyNumBytes is the number of bytes of entropy to use for the ephemeral secret key.
  // The ephemeral secret is derived by interpreting this array as a little-endian number and reducing it modulo the scalar field order,
  // so the `ephemeralSecretEntropyNumBytes` should be set to a significantly larger value than the scalar field order's byte length
  // to ensure that the resulting secret key has a close to uniform distribution.
  constructor(
    curve: AffineCurve<bigint>,
    ephemeralSecretEntropyNumBytes: number
  ) {
    this.curve = curve;
    this.ephemeralSecretEntropyNumBytes = ephemeralSecretEntropyNumBytes;
  }

  // encrypts a message to a given receiver public key rB, where r is the receiver's secret key and B is the curve's base point
  public encrypt(
    msg: Uint8Array,
    receiverPubkey: AffinePoint<bigint>
  ): HybridCiphertext {
    // sample ephemeral secret
    const ephemeralSecretEntropy = crypto.getRandomValues(
      new Uint8Array(this.ephemeralSecretEntropyNumBytes)
    );
    const ephemeralSecret = this.curve.ScalarField.fromEntropy(
      ephemeralSecretEntropy
    );

    // construct plaintext: ephemeralSecret || msg
    const ephemeralSecretBytes =
      this.curve.ScalarField.toBytes(ephemeralSecret);
    const plaintext = new Uint8Array(ephemeralSecretBytes.length + msg.length);
    plaintext.set(ephemeralSecretBytes);
    plaintext.set(msg, ephemeralSecretBytes.length);

    // encapsulate ephemeral secret
    const encapsulatedSecret = this.curve.scalarMul(
      this.curve.BasePoint,
      ephemeralSecret
    );

    // compute shared secret
    const sharedSecret = this.curve.scalarMul(receiverPubkey, ephemeralSecret);

    // derive IKM from shared secret and encapsulated secret
    const encapsulatedSecretBytes = this.curve.toBytes(encapsulatedSecret);
    const sharedSecretBytes = this.curve.toBytes(sharedSecret);
    const ikm = new Uint8Array(
      encapsulatedSecretBytes.length + sharedSecretBytes.length
    );
    ikm.set(encapsulatedSecretBytes);
    ikm.set(sharedSecretBytes, encapsulatedSecretBytes.length);

    // derive ephemeral encryption key from IKM
    const prk = HKDF_SHA256.extract(ikm);
    const ephemeralKey = HKDF_SHA256.expand(prk, KEY_LENGTH);

    // encrypt
    const cipher = new ChaCha20Poly1305(ephemeralKey);
    const nonce = deriveBaseNonce(HKDF_SHA256, sharedSecretBytes, NONCE_LENGTH);
    const ciphertextBytes = cipher.seal(nonce, plaintext);
    cipher.clean();

    return {
      ciphertextBytes,
      encapsulatedSecretBytes,
    };
  }

  decrypt(
    ciphertext: HybridCiphertext,
    receiverPrivateKey: bigint
  ): Uint8Array {
    const decryptionError = new Error("failed to decrypt");

    // deserialize stuff
    const { ciphertextBytes, encapsulatedSecretBytes } = ciphertext;

    const encapsulatedSecret = this.curve.fromBytes(encapsulatedSecretBytes);
    if (encapsulatedSecret === null) {
      throw decryptionError;
    }

    // compute shared secret
    const sharedSecret = this.curve.scalarMul(
      encapsulatedSecret,
      receiverPrivateKey
    );

    // derive IKM from shared secret and encapsulated secret
    const sharedSecretBytes = this.curve.toBytes(sharedSecret);
    const ikm = new Uint8Array(
      encapsulatedSecretBytes.length + sharedSecretBytes.length
    );
    ikm.set(encapsulatedSecretBytes);
    ikm.set(sharedSecretBytes, encapsulatedSecretBytes.length);

    // decrive ephemeral encryption key from IKM
    const prk = HKDF_SHA256.extract(ikm);
    const ephemeralKey = HKDF_SHA256.expand(prk, KEY_LENGTH);

    // decrypt
    const cipher = new ChaCha20Poly1305(ephemeralKey);
    const nonce = deriveBaseNonce(HKDF_SHA256, sharedSecretBytes, NONCE_LENGTH);
    const plaintext = cipher.open(nonce, ciphertextBytes);
    if (plaintext === null) {
      throw decryptionError;
    }
    cipher.clean();

    // extract ephemeral secret and msg from plaintext
    const numEphemeralSecretBytes = Math.ceil(
      this.curve.ScalarField.NumBits / 8
    );
    const ephemeralSecretBytes = plaintext.slice(0, numEphemeralSecretBytes);
    const msg = plaintext.slice(numEphemeralSecretBytes);
    const ephemeralSecret =
      this.curve.ScalarField.fromBytes(ephemeralSecretBytes);
    if (ephemeralSecret === null) {
      throw decryptionError;
    }

    // check ephemeralSecret against encapsulated secret
    const encapsulatedSecretCheck = this.curve.scalarMul(
      this.curve.BasePoint,
      ephemeralSecret
    );
    if (!this.curve.eq(encapsulatedSecret, encapsulatedSecretCheck)) {
      throw decryptionError;
    }

    return msg;
  }
}
