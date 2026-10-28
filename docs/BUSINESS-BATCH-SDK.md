# Business batch planning: read-only SDK

parseBusinessBatchCsv(csv) validates exact headers, 1–50 local draft rows, unique references, canonical Testnet G-addresses, <=7 decimal display precision and <=8 unique lowercase corridor UUIDs. Returned drafts are caller-owned, in-memory data. No storage, signing or network operations happen during parsing.

StealthBridgeClient.corridorBatch(routeIds) fetches only public operator-enabled corridor records via a GET-only endpoint. The IDs are the *only* user-supplied values in the request; private amounts, references and recipient addresses are never transmitted. validCorridorBatch checks complete, ordered partitioning into configured and missing IDs and rejects any positive financial capabilities. assessBusinessBatch returns row counts and always financialExecutionAuthorized=false.

Configured metadata is not a provider quote, issuer eligibility, verified decimals, liquidity, compliance, private transfer proof or settlement authorization. The SDK is not published in this source milestone. Its pinned backend OpenAPI source is commit 82ea6953468b7acd2139ba2e0d026bfab5797791.
