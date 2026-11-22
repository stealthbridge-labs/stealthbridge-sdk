# Security Policy — StealthBridge (sdk)

## Scope
This repository contains the official TypeScript ESM software development kit (`@stealthbridge/sdk`) for StealthBridge. It is experimental **Stellar Testnet-only** client software and has not completed an independent third-party cryptographic audit. Real funds, production credentials, unencrypted private payment notes, zero-knowledge witness secrets, and actual fiat banking/custody credentials must never be passed to this package.

## Responsible reporting
Do not disclose critical vulnerabilities, prototype pollution issues, or cryptographic flaws in public GitHub issues, pull requests, or discussions.

If the repository's GitHub private vulnerability reporting is enabled, please submit reports directly via **Security → Report a vulnerability**. Otherwise, contact the organization maintainers privately to coordinate confidential evaluation and patching.

Please include in your report:
- Impacted module, function, or schema parser
- Deterministic, non-destructive reproduction steps or test case
- Expected vs. observed security property
- Assessment of impact (e.g., client-side injection, verification bypass, cryptographic parsing error)

Do not include private keys, live network secrets, or real customer credentials.

## SDK Security Commitments & Architectural Invariants
- **Zero Runtime Dependencies:** The package maintains zero external runtime npm dependencies (`"dependencies": {}`), completely eliminating third-party supply-chain compromise vectors.
- **Strict Non-Custodial Design:** The SDK never generates, holds, or persists user private keys or wallet mnemonics. Transaction signing is delegated exclusively to caller-provided, user-authorized wallet providers or smart account signers.
- **Strict Runtime Schema Validation:** All server responses, wire types, and external payloads are validated against strict structural schemas. Unexpected fields, non-whitelisted properties, and prototype pollution attempts are rejected at the boundary.
- **Cryptographic Invariants & Canonical Digests:** Instruction digests, settlement commitments, and note commitments are computed deterministically using standard SHA-256 Web Crypto primitives.
- **Exact Integer Financial Math:** The SDK uses strict integer Stroop/micro-unit representations for financial quantities to eliminate IEEE-754 floating-point rounding errors and precision loss.
- **Protocol 30 Address Validation:** All address inputs are validated using official StrKey decoding routines supporting standard public keys (`G...`), muxed accounts (`M...`), contract identifiers (`C...`), and Protocol 30 CAP-84 muxed accounts (`W...`).

## Important
No guarantee of financial security or transaction finality is made until formal verification, independent cryptographic audit, and mainnet governance deployment are complete. All deployments remain strictly restricted to Stellar Testnet (`mainnet_enabled: false`, `fiat_payouts_enabled: false`, `live_fx_enabled: false`).
