# API 0.3 OpenAPI → SDK compatibility (read-only)

Source: `stealthbridge-labs/stealthbridge-backend` commit `acad5777f2217917421469e9722fbfbf6222ff7a`, path `api/openapi.yaml`. Snapshot: `specs/backend-openapi.v0.3.yaml`. This revision documents a disabled settlement POST returning **501**, not a callable SDK operation.

## Reproducible regeneration

Run `npm ci`, `npm run generate:api-types`, `npm run check:api-types` and `npm run verify` at the SDK repository root. The pinned schema generates `src/generated/api-wire.ts` without fetching unreviewed upstream code. CI fails when generated output differs or the version/key inventory changes. The SDK's public `NetworkStatus`, `Capabilities`, `Corridor`, `CorridorPage`, `Readiness`, `LedgerCheckpoint`, and `TransactionObservation` extend generated wire interfaces; the HTTP client still checks untrusted values at runtime and fails closed.

To upgrade: review changes in backend OpenAPI, update the snapshot and pinned revision in the generator, regenerate types, and run all SDK compatibility tests plus frontend/browser schema mismatch tests. Schema migrations require a release compatibility review before changing public types; this does not publish to npm. Cross-repository automated head comparison is a separate backend gate.

No payment execution, wallet signing, private witnesses, transfer submission, or live contract claims are introduced.
