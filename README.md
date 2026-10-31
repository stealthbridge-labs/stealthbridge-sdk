<div align="center"><img src="assets/stealthbridge-logo.svg" alt="StealthBridge — Confidential payments. Without borders." width="760" /></div>

# StealthBridge — TypeScript SDK

**Strict, testnet-only developer interfaces for publicly observable payment-route metadata and operational checks.**

[Product](https://stealthbridge.vercel.app) · [Backend OpenAPI](https://github.com/stealthbridge-labs/stealthbridge-backend/blob/main/api/openapi.yaml) · [Compatibility](specs/COMPATIBILITY.md) · [Architecture](docs/ARCHITECTURE-AND-DELIVERY.md)

## What exists

`@stealthbridge/sdk` is a native ESM TypeScript library that validates bounded HTTP data from the **Rust/Axum backend** and provides safe, exact-value local utilities. It is intentionally a **private, not-yet-published package** (`package.json` has `private: true`). Client-side payment signing, custody, private notes, ZK witness handling, issuer attestation, fee collection, fiat payout and money movement **are not implemented**.

It supports real Testnet network readings, corridor paging/filtering and single/batch metadata, fresh live preflights, public recipient presence, public observer data, governance/source inventory snapshots and checked asset math. Malformed, stale, wrong-network or falsely payment-enabled responses fail closed.

### Where the SDK fits

```text
Web / Node.js / service consumers
          |
          v
@stealthbridge/sdk (validated public read models)
          |
          v
Rust/Axum API ───► Stellar Testnet RPC
       |
       └────────► Neon PostgreSQL (operator-configured public route records)

Customer sign-in, profile changes and organization roles:
  Next.js same-origin authenticated bridge → Rust backend
  (not an unauthenticated SDK consumer operation)
```

The customer app is organized into Home, Personal Send, Business onboarding/team management, a separate business payment planner and a local CSV batch planner. These are product workflows, **not** SDK-enabled execution. [Product architecture](https://github.com/stealthbridge-labs/stealthbridge-frontend/blob/main/docs/PRODUCT-ARCHITECTURE-AND-JOURNEYS.md).

## Local usage

Requires Node.js **22+** and ESM. No npm registry publication is needed when consuming the package locally.

```bash
npm ci
npm run verify
```

`npm run verify` builds and type-checks, checks exact backend OpenAPI wire types, tests rejection cases, packages a local tarball and exercises isolated Node/Next.js consumers. It performs **no Testnet transactions** and requires no keys.

### Read-only example

```ts
import { StealthBridgeClient } from "@stealthbridge/sdk";

const client = new StealthBridgeClient({
  apiBaseUrl: "https://stealthbridge-backend.vercel.app",
  network: "testnet",
});
const ledger = await client.liveNetwork({ maxAgeSeconds: 180 });
const first = await client.corridorsPage({ limit: 25 });
console.log(ledger.ledger_sequence, first.items.length);

// Public UUIDs only: no recipient, amount, or business reference is sent.
const publicIds = first.items.slice(0, 8).map(row => row.id);
if (publicIds.length) {
  const preflight = await client.corridorBatchPreflight(publicIds);
  console.log(preflight.read_only_dependencies_ready);
  // Never treat this as permission to submit funds.
}
```

Configured corridor records, even when returned successfully, **are not FX quotes or enabled partner settlement**. The SDK requires real backend responses, validates strict schema and network identity, and does not substitute example records for unavailable database state.

### Available capabilities

| API helper | Data returned | Does not establish |
| --- | --- | --- |
| `network()`, `liveNetwork()`, `readiness()` | Testnet RPC and infrastructure freshness | Privacy or payment availability |
| `corridorsPage()`, `scanCorridors()`, `corridor(id)` | Enabled operator route metadata and paging | FX pricing or liquidity |
| `corridorBatch(ids)`, `corridorBatchPreflight(ids)` | Bounded public UUID batch and live dependency checks | Batch transfer permission |
| `corridorPreflight(id)` | Route snapshot and independently checked dependency state | Issuer, recipient or bank approval |
| `observerHead()`, `transaction(hash)` | Public ledger observations | Final settlement or payout |
| `contracts()`, governance observation reads | Source ABI and historical/current public governance observations | Canonical deploy authority or cryptographic proof |
| `AssetAmount` and local settlement transition helpers | Checked integer/minor-unit arithmetic and domain state rules | User balance, transaction or signed receipt |

The SDK's bundled OpenAPI snapshot and generated wire model must track the reviewed backend revision. Release CI enforces source parity; see [schema compatibility](specs/COMPATIBILITY.md) and [developer guide](docs/DEVELOPER-GUIDE.md).

## Security and error handling

- Testnet network passphrase is fixed; unsupported networks and untrusted plaintext remote API URLs are rejected.
- Bounded request timeout, cancellation and streamed 64 KiB response ceiling.
- Opt-in retries are limited to idempotent GET reads; no implicit money-moving retries or fabricated fallback data.
- Errors expose stable HTTP/code/path information, not raw upstream secrets.
- Asset amounts use `bigint` minor units, not floating-point currency calculations. Caller must validate real asset identity, issuer and decimals.
- Canonical Soroban v1 manifest is still an **outdated integration record** that says `not-deployed`, even though three public governance contracts were actually deployed October 17, 2026. A new approved manifest and fresh independent attestation are separate release gates.
- An optional **illustrative** `quotePlatformFee` helper has `collectionEnabled = false`; it does not transfer or accrue fees.

See [fee quote boundaries](docs/PLATFORM-FEE-QUOTES.md), [source interface specification](specs/COMPATIBILITY.md), and [Security](SECURITY.md).

## Developer integration roadmap

1. Pin and validate backend wire contracts across CI, plus isolated package-consumer checks.
2. Introduce reviewed customer/organization access models **without** exposing server-only account bridge credentials to browser SDK code.
3. Verify independent Soroban privacy mechanisms, smart-account recovery, signer policies and legitimate issuers.
4. Expose financial mutations only after separately audited contracts, licensing/compliance checks, payout providers and reconciliation.

### Other repositories

[Frontend](https://github.com/stealthbridge-labs/stealthbridge-frontend) · [Backend](https://github.com/stealthbridge-labs/stealthbridge-backend) · [Soroban contracts](https://github.com/stealthbridge-labs/stealthbridge-contracts) · [Roadmap](ROADMAP.md)

**Read-only tooling. Testnet only. No real customer payments.**
