# Changelog

### Unreleased

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
