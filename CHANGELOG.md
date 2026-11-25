# Changelog

Notable user-visible SDK changes are recorded here. Versions follow [Semantic Versioning](https://semver.org/) once release publication is authorized.

## 0.3.0 (2026-11-24)

First release intended for public npm publication.

### Added

- `validDeployRequest`, `validDeploymentDirectory`, `validSmartAccountLabel`: canonical contracts for
  `/v1/account/smart-accounts/deployments` (relayed passkey smart-account creation on Stellar Testnet). A deployment
  is only valid as `deployed` when it carries the ledger in which the backend observed it.
- `p256PointFromSpki`, `base64url`: extract the uncompressed P-256 public key from a WebAuthn `getPublicKey()` SPKI
  with a strict prefix check (non-P-256 keys are rejected).
- `TESTNET_CONTRACTS`, `TESTNET_NETWORK_PASSPHRASE`: verified 2026-11-24 Testnet contract ids (smart-account factory,
  governance gate, settlement adapter, registries, fee vault, paused privacy verifier).
- `SettlementLifecycleError` explains HTTP 422 (chain evidence did not match the settlement intent).
- npm metadata (`repository`, `homepage`, `bugs`, `keywords`), `publishConfig` with provenance, and a tag-driven
  release workflow.

### Changed

- The package is no longer `private`.

## Unreleased (pre-0.3.0 history)

### Added

- Tarball integrity, Node.js 22 ESM, TypeScript declaration, browser bundle safety, and tree-shaking checks using isolated consumers.
- A pinned Next.js 16.4 App Router production-build fixture covering SDK imports from Server and Client Components.
- Documented root exports, runtime compatibility, consumer errors, size budgets, and the release workflow.

### Changed

- Declared the ESM `import` export condition and side-effect-free package modules for bundlers.

No npm publication or production-readiness claim is associated with these changes.
