// `base_nonce` derivation following HPKE RFC
import { i2osp } from "../utils";

export interface HPKEKDF {
  extract(ikm: Uint8Array, salt?: Uint8Array): Uint8Array;
  expand(prk: Uint8Array, outputLen: number, info?: Uint8Array): Uint8Array;
}

// mode 0x00: encrypt to public key
export const MODE = i2osp(0x00n, 1);

// b"HPKE-v1"
export const HPKE_V1_LABEL = new Uint8Array([72, 80, 75, 69, 45, 118, 49]);

// b"HPKE"
export const HPKE_LABEL = new Uint8Array([72, 80, 75, 69]);

// b"psk_id_hash"
export const PSK_ID_HASH_LABEL = new Uint8Array([
  112, 115, 107, 95, 105, 100, 95, 104, 97, 115, 104,
]);

// b"info_hash"
export const INFO_HASH_LABEL = new Uint8Array([
  105, 110, 102, 111, 95, 104, 97, 115, 104,
]);

// b"secret"
export const SECRET_LABEL = new Uint8Array([115, 101, 99, 114, 101, 116]);

// b"base_nonce"
export const BASE_NONCE_LABEL = new Uint8Array([
  98, 97, 115, 101, 95, 110, 111, 110, 99, 101,
]);

// KEM using nocturne PKI (a non-spec compliant DHKEM). Not registered.
export const KEM_ID = i2osp(0xffaan, 2);
// HKDF using SHA256
export const KDF_ID = i2osp(0x0001n, 2);
// ChaCha20Poly1305
export const AEAD_ID = i2osp(0x0003n, 2);

export const SUITE_ID = new Uint8Array(
  HPKE_LABEL.length + KEM_ID.length + KDF_ID.length + AEAD_ID.length
);
SUITE_ID.set(HPKE_LABEL);
SUITE_ID.set(KEM_ID, HPKE_LABEL.length);
SUITE_ID.set(KDF_ID, HPKE_LABEL.length + KEM_ID.length);
SUITE_ID.set(AEAD_ID, HPKE_LABEL.length + KEM_ID.length + KDF_ID.length);

// all empty as we don't need them in our setting
export const PSK_ID = new Uint8Array(0);
export const PSK = new Uint8Array(0);
export const INFO = new Uint8Array(0);

export function deriveBaseNonce(
  kdf: HPKEKDF,
  sharedSecret: Uint8Array,
  aeadNonceLen: number,
  info: Uint8Array = INFO
): Uint8Array {
  const pskIdHash = labeledExtract(kdf, PSK_ID_HASH_LABEL, PSK_ID);
  const infoHash = labeledExtract(kdf, INFO_HASH_LABEL, info);

  // concat(mode, psk_id_hash, info_hash)
  const keyScheduleContext = new Uint8Array(
    MODE.length + pskIdHash.length + infoHash.length
  );
  keyScheduleContext.set(MODE);
  keyScheduleContext.set(pskIdHash, MODE.length);
  keyScheduleContext.set(infoHash, MODE.length + pskIdHash.length);

  // LabeledExtract(shared_secret, "secret", psk)
  const secret = labeledExtract(kdf, SECRET_LABEL, PSK, sharedSecret);

  // LabeledExpand(secret, "base_nonce", key_schedule_context, Nn)
  return labeledExpand(
    kdf,
    BASE_NONCE_LABEL,
    secret,
    aeadNonceLen,
    keyScheduleContext
  );
}

function labeledExtract(
  kdf: HPKEKDF,
  label: Uint8Array,
  ikm: Uint8Array,
  salt?: Uint8Array
): Uint8Array {
  // concat("HPKE-v1", suite_id, label, ikm)
  const labeledIKM = new Uint8Array(
    HPKE_V1_LABEL.length + SUITE_ID.length + label.length + ikm.length
  );
  labeledIKM.set(HPKE_V1_LABEL);
  labeledIKM.set(SUITE_ID, HPKE_V1_LABEL.length);
  labeledIKM.set(label, HPKE_V1_LABEL.length + SUITE_ID.length);
  labeledIKM.set(ikm, HPKE_V1_LABEL.length + SUITE_ID.length + label.length);

  return kdf.extract(labeledIKM, salt);
}

function labeledExpand(
  kdf: HPKEKDF,
  label: Uint8Array,
  prk: Uint8Array,
  len: number,
  info?: Uint8Array
): Uint8Array {
  if (len > 256 ** 2) {
    throw new Error("labeledExpand: length too large");
  }

  // concat(I2OSP(L, 2), "HPKE-v1", suite_id, label, info))
  const labeledInfo = new Uint8Array(
    2 +
      HPKE_V1_LABEL.length +
      SUITE_ID.length +
      label.length +
      (info ? info.length : 0)
  );
  labeledInfo.set(i2osp(BigInt(len), 2));
  labeledInfo.set(HPKE_V1_LABEL, 2);
  labeledInfo.set(SUITE_ID, 2 + HPKE_V1_LABEL.length);
  labeledInfo.set(label, 2 + HPKE_V1_LABEL.length + SUITE_ID.length);

  if (info) {
    labeledInfo.set(
      info,
      2 + HPKE_V1_LABEL.length + SUITE_ID.length + label.length
    );
  }

  return kdf.expand(prk, len, labeledInfo);
}
