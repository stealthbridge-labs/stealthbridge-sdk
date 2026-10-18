import test from "node:test";
import assert from "node:assert/strict";
import { checkGovernanceObservation, PASSPHRASE } from "../scripts/check-governance-observation.mjs";

const id = n => "C" + String(n).repeat(55);
const account = "G" + "A".repeat(55);
const item = n => ({ contractId: id(n), wasmSha256: "a".repeat(64), abiSha256: "b".repeat(64), deploymentTx: "c".repeat(64), deploymentLedger: 1, readbackWasmMatches: true, observedAdmin: account, observedPaused: false });
function observation() {
  return { schemaVersion: 2, recordType: "soroban-testnet-governance-deployment-observation",
    network: "testnet", networkPassphrase: PASSPHRASE, administrator: account, deployer: account,
    contracts: { "corridor-registry": item("A"), "policy-registry": item("B"), "governance-gate": { ...item("D"), observedCorridorRegistry: id("A"), observedPolicyRegistry: id("B") } },
    scope: { paymentExecutionEnabled: false, platformFeesEnabled: false, privacyVerified: false, fiatPayoutEnabled: false },
    verification: { independentExternalAuditCompleted: false } };
}
test("consistent historical observations never convey live authority", () => {
  const result = checkGovernanceObservation(observation());
  assert.equal(result.consistent, true, result.failures.join(", "));
  assert.equal(result.trustedForLiveCalls, false);
  assert.equal(result.paymentExecutionEnabled, false);
});
test("rejects substituted governance dependency", () => {
  const e = observation(); e.contracts["governance-gate"].observedPolicyRegistry = id("Z");
  assert.equal(checkGovernanceObservation(e).consistent, false);
});
test("rejects fee-collection capability", () => {
  const e = observation(); e.scope.platformFeesEnabled = true;
  assert.equal(checkGovernanceObservation(e).consistent, false);
});
test("rejects an incorrect network and duplicated contract IDs", () => {
  const e = observation(); e.networkPassphrase = "Public Global Stellar Network ; September 2015";
  e.contracts["policy-registry"].contractId = id("A");
  const result = checkGovernanceObservation(e);
  assert.equal(result.consistent, false);
  assert.ok(result.failures.some(x => x.includes("duplicate")));
});
