# Changelog

### Unreleased

- add `NumBits` and `NumBytes` to `AffineCurve`
- expose separate entrpoints for browser and node
- add `SerializedHybridCiphertext` and two functions for converting to/from `HybridCiphertext` to avoid with browser `Uin8Array` nonsense
- add `NumBytes` to `PrimeField`
- rename package to `@nocturne-xyz/crypto-utils`
- add module `hybrid-encryption` containing a generic `HybridCipher` 
- add separate `fromEntropy` method to `PrimeField` for reducing arbitrary `Uint8Array`s into field elements
- add `toBytes` and `fromBytes` to curve
- make `ZModPField.toBytes` and `ZModPField.fromBytes` algorithmic constant-time
- add separate best-effort constant-time scalar mul
- restructure into two sub-modules: `hashes` and `algebra`.
- impl Baby JubJub curve using `TwistedEdwardsCurve` abstraction
- add `TwistedEdwardsCurve` abstraction
- add `AffineCurve` interface
- test poseidon
- port circomlibjs's BN poseidon impl
- test BN254 scalar Field
- impl BN254 scalar field using `ZModPField` abstraction
- add `ZModPField` abstraction
- add `PrimeField` interface
