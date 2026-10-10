# StealthBridge SDK — Developer Platform Roadmap

> **Engineering status: active, Testnet-first development.** This is a living implementation roadmap, not a feature announcement. No real funds, fabricated corridors, invented prices, alleged issuer partnerships or unsupported privacy guarantees. Work is complete only when code, tests, interface documentation and verifiable operational evidence exist.

**Cross-repository contract:** [Frontend](https://github.com/stealthbridge-labs/stealthbridge-frontend/blob/main/ROADMAP.md) · [Backend](https://github.com/stealthbridge-labs/stealthbridge-backend/blob/main/ROADMAP.md) · [Contracts](https://github.com/stealthbridge-labs/stealthbridge-contracts/blob/main/ROADMAP.md) · [SDK](https://github.com/stealthbridge-labs/stealthbridge-sdk/blob/main/ROADMAP.md)

## October 2026 implementation checkpoint and next delivery slices

The [SDK architecture and delivery plan](docs/ARCHITECTURE-AND-DELIVERY.md) records current exports, consumption rules, failure states, contract source pinning and future signer boundaries.

**Verified code/CI baseline:** a private, unpublished ESM package with typed read-only Testnet client, freshness checks, exact asset value operations, validated public G-addresses, corridor paging, transaction observation, strict capability checks and three-contract source-interface validation. The packed package passes Node/browser/Next.js consumer tests, not a live transfer test.

| Order | SDK workstream | Done only when |
| --- | --- | --- |
| S1 | Generate types from pinned backend OpenAPI | Versioned schema and runtime validation parity; negative response fixtures |
| S2 | Unified frontend consumption | No duplicated unsafe parser, ESM/bundle size and browser error tests |
| S3 | Independent Testnet contract readers | Three verified deployed instances, bytecode/source ABI/admin attestations, wrong-network and wrong-method rejection |
| S4 | Wallet signing interfaces, isolated from read client | Explicit human approval, signer revocation, scoped authorization, no secrets in SDK or logs |
| S5 | Cryptographic privacy and settlement adapters | Pinned upstream protocols, test vectors, recovery/metadata reviews, audit and real Testnet evidence |
| S6 | Publish and support | Maintainer license approval, signed artifact provenance, changelog and compatibility matrix |

**Do not equate a package release with protocol deployment.** Production npm publishing, contract address binding, and enabling payment-writing methods require separate decisions.

## Mission

Make StealthBridge usable by institutional developers, wallet builders and application teams through predictable typed interfaces, safely versioned contract clients, network-pinned transaction observation and explicit capability discovery. SDKs are not custodians: they must not collect wallet seeds, private note secrets, ZK witnesses or unconsented financial data. The SDK must never hide different cryptographic trust models behind one vague "private payment" method.

## Current implemented surface

- Testnet-only TypeScript `StealthBridgeClient` with remote HTTPS enforcement and methods to discover network, capabilities and real operator-configured corridors.
- Privacy-minimized read-only public transaction status lookup by exact 64-character hash with clear API errors.
- Typed settlement and privacy-rail models; isolated offline test fixtures and CI TypeScript/Node validation.
- No wallet signing, contract deployment, payer/recipient shielding or actual transfer methods.

## API clients and protocol contract alignment

Generate HTTP client/types from the backend's versioned OpenAPI file with pinned commit/tag and deterministic tools. Compare generated output with source schema in CI and reject incompatible type drift. Cover network passphrase, numeric serialization, asset precision, 404/502/503 error models, retries, paging, abort, timeouts, content-type validation and request correlation. Create dedicated transaction, corridor, asset, eligibility, quote and settlement namespaces only when respective authenticated backend endpoints exist. A server 501/503 must remain an error, never a fabricated client-side settlement result.

## Stellar wallet and network adapters

Support official current Stellar JS SDK and Freighter API with **user-owned signing**, network mismatch rejection, account permission revocation, account-switch behavior, transaction preflight review, timeout/cancellation and clear error types. Do not introduce direct private-key methods in browser or server SDK. Investigate additional wallets behind a capability-checked interface and separately audit signing semantics for transaction vs authorization-entry signatures. Keep contract calls network- and contract-version-bound. Never auto-submit money movement from a read function.

## Contract interfaces and artifact lifecycle

Consume verified WASM ABI and deployment manifest released by contracts, including wasm digest, network passphrase, contract ID, protocol/sdk version and public source commit. Generate and test strongly typed Soroban contract bindings. Validate contract addresses and asset IDs; no placeholder IDs, silent chain switching or unverified issuer names in packages. Maintain compatibility table mapping backend release, SDK release, network protocol and contract build. Support receipt decoding only for public fields proven safe to disclose.

## Privacy adapters (separate implementations)

**Confidential Tokens:** issuer-aware account authorization, confidential amounts/balances, transfer proof lifecycle, allowed scoped view capability, policy failure errors and explicit visible counterparty metadata.

**Stellar Private Payments:** pool-specific deposit, shielded transfer, withdrawal, encrypted note sync, local storage/recovery and nullifier/proof handling, with clear public edge visibility. No shared arbitrary `transfer()` API until equivalence is demonstrated. Pin upstream prover packages, WASM parameters, proving resources and supported pool assets; report unsupported protocols rather than inventing implementations.

## Asset precision, quoting and FX integrations

Represent transfer values as decimal strings or exact scaled integers, with deterministic parse, rounding, min-received calculation and validation derived from issuer/asset precision. Do not introduce floating point for financial quantities. A quote is executable only when signed, not expired, bound to asset/beneficiary/corridor and backed by an authenticated provider response. Cross-currency fiat payout and Stellar on-chain token movement remain two independent events, each with separate attestations and failure handling.

## Software quality and developer experience

Ship TypeScript first, then Rust clients only when interface stability and actual demand justify them. Add node and browser ESM support, bundle analysis, typed docs, real RPC examples (read-only), integration test fixtures, API-error guides, changelog, SemVer policy, migration tutorials and source maps. Use `npm test` with no external credentials for strict read-only methods. Add compatibility CI against a disposable Testnet backend when available, including contract artifact checks. Later publish packages to a registry only with maintainer approval, signed release provenance and license decision.

## Security, observability and operations

No personal info in telemetry, no credentials in examples, restrict URL protocols/SSRF, safe error messages, content-type/size limits, AbortSignal propagation, safe retry policy and no auto-retry of unapproved value transfers. Test replays, wrong network, revoked wallet permissions, transaction retention, malformed hashes and unsupported privacy modes. Provide optional logging hooks that default to off and redact account/settlement references.

## Contributor-ready interfaces and release gates

Initial issues: [OpenAPI generated bindings](https://github.com/stealthbridge-labs/stealthbridge-sdk/issues/1) and [Wallet-owned privacy adapters](https://github.com/stealthbridge-labs/stealthbridge-sdk/issues/2). A client feature is releasable only when it has typed error behavior, deterministic tests, pinned upstream API/contract version, security notes, clear UX documentation and independently observed Testnet behavior for on-chain claims. Support external integrators only after backward-compatible API rules are documented and verified.
