# Governance deployment attestation — SDK consumer contract

The contracts repository's `governance-deployment-evidence.v2.json` is an **observation**, not a verified client trust anchor. The v1 canonical manifest still says `not-deployed`. Application developers must not import a public contract ID into a client and treat it as authenticated.

## Proposed typed status API (not yet implemented)

```ts
type GovernanceAttestationStatus =
  | { state: "unavailable" | "unverified"; paymentsEnabled: false; feesEnabled: false; reason: string }
  | {
      state: "verified";
      network: "testnet";
      observedLedger: number;
      observedAt: string;
      manifestDigest: string;
      contracts: {
        corridorRegistry: string;
        policyRegistry: string;
        governanceGate: string;
      };
      paymentsEnabled: false;
      feesEnabled: false;
    };
```

These types describe a *future* server-verified observation, not SDK-local source-of-truth. The trusted Rust backend must authenticate an approved signed canonical manifest, perform fresh chain reads and check all dependencies before reporting verified status. SDK decoders should reject unknown schema versions, incorrect network, stale/missing ledger metadata, empty/duplicate contract IDs, partial success and a claimed enabled payment capability.

Wallet connection and the current transparent fee quote remain separate: neither grants authority to collect fees or sign a transfer.

## Release tests

Build fixtures from separately checked real observations, then mutate contract ID, hash, network, TTL, admin, registry binding, pause state and signature independently. Verify each mutation fails closed. Never substitute hardcoded success responses into production clients.
