# SDK: live corridor preflight

StealthBridgeClient.corridorPreflight(corridorUuid) makes a single bounded GET to the backend public Testnet corridor metadata preflight endpoint. The caller transmits only the public operator corridor UUID, not an amount, recipient, personal identity or payment reference.

The returned CorridorPreflight includes exact configured corridor identity, current network freshness, a bounded ledger sequence, SQLx schema readiness and explicit false flags for financial execution, fees, issuer support, liquidity, privacy verification and payouts.

The exported validCorridorPreflight enforces a strict version-1 schema, exact UUID matching, a 120-second observation lifetime, mutually consistent network/schema readiness, and false capability flags. Unknown keys, stale responses and forged authority are rejected. The method does not construct or authorize Soroban invocations, sign messages or send funds.

Packaged Node ESM/browser/Next.js consumers and tests verify the public API. No npm publication is performed automatically.
