# StealthBridge integration compatibility — v0.3

| Component | Interface | Status |
| --- | --- | --- |
| Backend | `/health`, `/v1/network`, `/v1/capabilities`, `/v1/corridors` | Rust implementation committed, deployment pending |
| Source network | Stellar Testnet RPC `getNetwork` + `getLatestLedger` | Live upstream API required |
| Corridors | Operator-configured PostgreSQL `corridors` | Empty until real configuration |
| SDK | Typed read-only `StealthBridgeClient`; Node.js 22+ native ESM; browser ES2022 bundle | Code and offline package consumers committed |
| Frontend | Same-origin Next.js API proxy | Code committed, requires backend URL |
| Contracts | CorridorRegistry WASM | No deployment or confidential transfer |
| SPP | Alpha SDK | Not integrated or verified |
| Confidential Tokens | Developer preview | Not integrated or verified |

## Invariants
- Backend must fail closed if a configured RPC reports another network.
- Do not fabricate corridor records, asset identities, exchange rates, partner integrations, or transaction success.
- Testnet RPC is not a confidential payment protocol. Never claim a value transfer until an actual audited/verified solution supports it.
- SDK has no server-side signing or wallet secret handling.
- When backend schema changes, update types and consumer compatibility tests atomically.

## Package compatibility and integrity

`@stealthbridge/sdk` exposes only its root entry point. Package exports resolve `dist/index.js` for ESM runtime consumers and `dist/index.d.ts` for TypeScript. The supported runtime contract is Node.js 22 or newer and browser applications targeting ES2022 with the standard Fetch and URL APIs. CommonJS and direct `dist/*` subpath imports are not supported.

The deterministic package test builds the SDK, creates the npm tarball without publishing it, verifies SHA-256 plus its npm-reported SHA-1 and SHA-512 digests, checks the exact file allowlist, and installs the tarball—not the repository source—into isolated Node ESM, TypeScript, esbuild, and Next.js consumers. The pinned Next.js 16.4 App Router fixture asserts that resolution ends at the installed `node_modules/@stealthbridge/sdk/dist/index.js`, then runs a production build containing both a Server Component and a `"use client"` Client Component. Browser metadata and output are rejected if they reference Node built-ins, CommonJS runtime globals, or wallet-secret identifiers. An `ApiError`-only consumer must remove the client and endpoint strings, remain below half of the full bundle size, and satisfy its absolute byte ceiling.

Current package-test baselines are approximately 18.1 KB packed, 61.7 KB unpacked, 10.47 KB for the full minified browser ESM bundle, 286 B for the tree-shaken `ApiError` bundle, and 11.3 KB across SDK-bearing Next.js client chunks. Enforced ceilings are respectively 28,000 B, 68,000 B, 10,500 B, 1,600 B, and 25,000 B. The headroom avoids platform and framework chunking noise while making a material dependency or tree-shaking regression fail CI. The pinned Next.js fixture's cold-cache run requires registry access and may add several minutes.

These checks establish packaging compatibility, not production readiness, backend availability, privacy, transfer correctness, settlement, or audit status.

## v0.3 transaction observation compatibility

The backend OpenAPI v0.3 defines `GET /v1/transactions/{hash}` for a user-supplied 64-character hex hash. The TypeScript client now exposes `transaction(hash)` returning `TransactionObservation` with status SUCCESS/FAILED, ledger and RPC source; 404 means not present in the node's retained history, **not** proof the transaction never existed. We intentionally omit raw envelope/result XDR, events and confidential payment data. Tests run offline with synthetic mocked fetch responses only.

The backend also includes a tenant-scoped internal intent journal (`src/store.rs`) but **there is no public authenticated mutation endpoint or SDK write method**. Preserve this boundary until wallet auth, proof verification, FX and payout reconciliation are independently implemented.

### Contract artifact resolution

The live contracts repository currently publishes schema version 1 with `network=testnet`, `status=not-deployed`, no contract IDs and no transaction hashes. The SDK accepts that exact empty state and never turns it into an active contract.

The SDK also parses the forward schema-v2 contract artifact shape for isolated compatibility fixtures. It requires the exact Testnet passphrase, supported protocol/API versions, a 40-character source revision, one ABI and WASM SHA-256 digest for every contract ID, and transaction evidence for a claimed deployment. Schema v1 cannot claim a deployment. A future canonical manifest must be generated from and pinned to a reviewed contracts release tag; the source revision must match that release's commit. A manifest alone is not independent chain attestation, so `getVerifiedContract` remains fail-closed until trusted RPC verification of network, contract ID and code hash is implemented.

The SDK's `contracts()` endpoint decoder is stricter than the local parser: it accepts only the current canonical undeployed schema-v1 response and the pinned source-level public method inventory. Claimed deployment metadata, extra methods, changed source paths, wrong network values and enabled payment flags are rejected as upstream protocol errors.

### Read-only transport invariants

Every SDK read has a bounded timeout (`timeoutMs`), optional caller `AbortSignal`, maximum JSON response size (64 KB), `Content-Type: application/json` validation, and runtime shape validation. The Testnet passphrase is verified in the client response, in addition to the backend RPC check. Unsupported data is rejected as an `ApiError(502)`, not converted into a payment success state. Cross-platform tests use native fetch and `AbortSignal.any` (Node.js 22+ / modern browsers).

Opt-in, bounded retry logic (`maxRetries` between 0 and 5, default 0) with exponential backoff (`retryBackoffMs`) applies strictly to read-only GET requests encountering retryable errors (429, 502, 503, 504, or network/timeout failures). Client status codes 400 and 404 are non-retryable. Caller `AbortSignal` cancellations are honored immediately during network fetches and backoff sleep delays. No implicit retries or fallback states are used.

The backend additionally provides `GET /v1/corridors/{id}`, with 400 for malformed UUIDs, 404 for disabled/missing records, and 503 for unavailable PostgreSQL. The SDK `corridor(id)` mirrors these checks and never synthesizes missing asset metadata.
