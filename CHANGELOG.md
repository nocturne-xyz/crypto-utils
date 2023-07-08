# Changelog

### Unreleased

- rename package to `@nocturne-xyz/crypto-utils`
- add module `hybrid-encryption` containing a generic `HybridCipher` 
- add separate `fromEntropy` method to `PrimeField` for reducing arbitrary `Uint8Array`s into field elements
- add `toBytes` and `fromBytes` to curve
- make `ZModPField.toBytes` and `ZModPField.fromBytes` algorithmic constant-time
- restructure into two sub-modules: `hashes` and `algebra`.
- add separate best-effort constant-time scalar mul
- impl Baby JubJub curve using `TwistedEdwardsCurve` abstraction
- add `TwistedEdwardsCurve` abstraction
- add `AffineCurve` interface
- test poseidon
- port circomlibjs's BN poseidon impl
- test BN254 scalar Field
- impl BN254 scalar field using `ZModPField` abstraction
- add `ZModPField` abstraction
- add `PrimeField` interface
