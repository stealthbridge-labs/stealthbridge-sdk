# SDK: live batch readiness (read-only)

corridorBatchPreflight(routeIds) fetches up to eight public Testnet IDs. The response contains a fresh RPC observation and SQLx schema-readiness status, plus a complete operator metadata batch. No recipient, amount, invoice or account is sent.

validCorridorBatchPreflight verifies exact v1 shape, freshness (120 seconds), consistent ledger/schema booleans, valid nested batch and all financial capability flags false. matchingCorridorBatches cross-checks all public metadata fields across independent catalog and preflight reads. Neither confirms issuer support, exchange rates, privacy, fiat payouts or a financial execution path.

The feature requires the matching backend route to be deployed. No npm publication, funds or contract upgrade is performed.

The pinned backend schema is reviewed at commit cec627830ce8b82d7c5e5676497d593027dfd56a.
