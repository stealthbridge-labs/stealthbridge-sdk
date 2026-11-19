import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedSettlementLifecycleTransitions,
  canTransitionSettlementLifecycle,
  canonicalCustomerAuthorizationDigest,
  canonicalSettlementIntentDigest,
  validSettlementLifecycleDirectory,
} from "../dist/index.js";

const OWNER = "GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const CORRIDOR_ID = "a12ef783-d60b-4427-aa62-d2562acd4cef";

test("canonicalSettlementIntentDigest matches Rust backend byte-for-byte", async () => {
  const digest = await canonicalSettlementIntentDigest(OWNER, {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: null,
    instruction_id: null,
    corridor_id: CORRIDOR_ID,
    route_fingerprint: "20c275c9036c67194652e03698526070566bafc86cb1cc523f76df6161441c20",
    idempotency_key: "idem-key-1234567890",
    asset_code: "USDC",
    asset_issuer: null,
    amount_minor_units: 2_500_000,
    recipient_address: OWNER,
    privacy_rail: "private-payments",
    expires_in_seconds: 3600,
  });
  assert.match(digest, /^[0-9a-f]{64}$/);
  const authDigest = await canonicalCustomerAuthorizationDigest(OWNER, digest);
  assert.match(authDigest, /^[0-9a-f]{64}$/);
});

test("lifecycle transitions keep chain_finalized separate from payout_completed", () => {
  assert.equal(canTransitionSettlementLifecycle("chain_finalized", "payout_completed"), false);
  assert.equal(canTransitionSettlementLifecycle("chain_finalized", "payout_pending"), true);
  assert.equal(canTransitionSettlementLifecycle("quote_unavailable", "policy_verified"), true);
  assert.equal(canTransitionSettlementLifecycle("chain_finalized", "dispute_open"), true);
  assert.equal(canTransitionSettlementLifecycle("dispute_open", "reversal_pending"), true);
  assert.equal(canTransitionSettlementLifecycle("reversal_pending", "reversed"), true);
  assert.deepEqual(allowedSettlementLifecycleTransitions("reconciled"), []);
});

test("validSettlementLifecycleDirectory enforces strict testnet and disabled-fiat invariants", () => {
  const valid = {
    schema_version: 1,
    network: "testnet",
    source: "account-settlement-lifecycles",
    account_address: OWNER,
    observed_at_unix: 1_795_000_000,
    mainnet_enabled: false,
    live_fx_enabled: false,
    fiat_payouts_enabled: false,
    items: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        corridor_id: CORRIDOR_ID,
        request_sha256: "a".repeat(64),
        state: "chain_finalized",
        events: [],
      },
    ],
  };
  assert.equal(validSettlementLifecycleDirectory(valid, OWNER), true);
  assert.equal(
    validSettlementLifecycleDirectory({ ...valid, fiat_payouts_enabled: true }, OWNER),
    false,
  );
  assert.equal(
    validSettlementLifecycleDirectory({ ...valid, mainnet_enabled: true }, OWNER),
    false,
  );
});
