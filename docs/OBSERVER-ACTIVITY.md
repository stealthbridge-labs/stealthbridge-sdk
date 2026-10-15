# Testnet Observer Activity — SDK v0.2 additive preview surface

**Usage:** `client.observerActivity({limit: 15, contractId, before, signal})` makes a single same-origin-compatible **GET** of `/v1/observer/activity`. The response is runtime-validated, with strict C-StrKey checksums, bounded page length, descending event+contract cursor ordering, approved Testnet fields, `payment_execution_enabled=false` and no unexpected private-event keys. The SDK transports no wallet secrets and has no signing action.

The endpoint is specified in `specs/observer-activity.v0.1.yaml`, mirrored from the backend additive extension `api/observer-activity.v0.1.yaml`; the canonical OpenAPI v0.3 types are intentionally not modified until a coordinated v0.4 backend/frontend model release. Keep this contract byte-for-byte synchronized at promotion. The method is an additive read-only SDK API; it does not change v0.3 endpoint signatures or publish a new private transfer primitive.

**Meaning:** journal `observation_status=checkpoint-present` means historical public metadata exists in PostgreSQL, **not** that a worker is fresh, an on-chain StealthBridge contract is deployed, a proof verified or a payment completed. `no-checkpoint` is a real empty state. Treat HTTP 503 as unavailable dependencies, never as zero events. Only a verified contract deployment can provide a product-specific contract ID. The official SAC or synthetic CI fixture is not proof of StealthBridge deployment.

Example:
```ts
import { StealthBridgeClient } from "@stealthbridge/sdk";
const client = new StealthBridgeClient({apiBaseUrl:"/api/bridge", network:"testnet"});
const page = await client.observerActivity({limit:15});
if (page.observation_status === "no-checkpoint") {
  // Show "No observer checkpoint configured" — not a fake transfer.
}
```

A browser may additionally compare public event transaction hashes with Stellar Testnet explorers but must not reveal raw XDR, private amounts, wallet metadata, or financial settlement controls.
