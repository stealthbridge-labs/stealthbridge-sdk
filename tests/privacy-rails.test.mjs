import test from "node:test";
import assert from "node:assert/strict";
import {
  assessPrivacyRailReadiness,
  describePrivacyRailArchitecture,
} from "../dist/index.js";

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

test("separates local encrypted drafts from confidential settlement rails", () => {
  const draft = describePrivacyRailArchitecture("local-encrypted-draft");
  assert.equal(draft.evaluatedFor, "storage-only");
  assert.equal(draft.productionReady, false);
  assert.equal(draft.executionEnabled, false);

  const assessment = assessPrivacyRailReadiness({
    experience: "personal",
    rail: "local-encrypted-draft",
    networkPassphrase: TESTNET_PASSPHRASE,
    assetSemantics: "exact-transfer-sep41",
    accountCreatedLedger: 5_800_000,
    rpcOldestRetainedLedger: 5_696_840,
    durableIndexerAvailable: true,
    recoverySeedBackedUp: true,
    externalOperatorOrIssuerVerified: false,
  });
  assert.equal(assessment.architecturallyEligible, false);
  assert.equal(assessment.executionEnabled, false);
  assert.ok(assessment.blockReasons.includes("draft-not-on-chain-settlement"));
});

test("evaluates personal private payments vs business confidential tokens without treating them as interchangeable", () => {
  const spp = describePrivacyRailArchitecture("private-payments");
  const ct = describePrivacyRailArchitecture("confidential-token");

  assert.equal(spp.evaluatedFor, "personal");
  assert.equal(ct.evaluatedFor, "business");
  assert.equal(spp.disclosure.publicCounterpartyGraph, false);
  assert.equal(ct.disclosure.publicCounterpartyGraph, true);
  assert.equal(spp.disclosure.publicEdgeAmount, true);
  assert.equal(ct.disclosure.auditorOrGlobalViewKeyDisclosure, true);
  assert.match(spp.licenseModel, /LGPL-3\.0/);
  assert.equal(ct.licenseModel, "MIT");

  const swapped = assessPrivacyRailReadiness({
    experience: "personal",
    rail: "confidential-token",
    networkPassphrase: TESTNET_PASSPHRASE,
    assetSemantics: "exact-transfer-sep41",
    accountCreatedLedger: 5_800_000,
    rpcOldestRetainedLedger: 5_696_840,
    durableIndexerAvailable: true,
    recoverySeedBackedUp: true,
    externalOperatorOrIssuerVerified: true,
  });
  assert.equal(swapped.architecturallyEligible, false);
  assert.ok(swapped.blockReasons.includes("rail-segment-mismatch"));
});

test("rejects wrong network, non-exact-transfer assets, pruned ledger history, and missing seed backup", () => {
  const result = assessPrivacyRailReadiness({
    experience: "business",
    rail: "confidential-token",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    assetSemantics: "fee-on-transfer",
    accountCreatedLedger: 5_500_000,
    rpcOldestRetainedLedger: 5_696_840,
    durableIndexerAvailable: false,
    recoverySeedBackedUp: false,
    externalOperatorOrIssuerVerified: false,
  });
  assert.equal(result.architecturallyEligible, false);
  assert.equal(result.productionReady, false);
  assert.equal(result.executionEnabled, false);
  assert.ok(result.blockReasons.includes("network-passphrase-mismatch"));
  assert.ok(result.blockReasons.includes("asset-not-exact-transfer-sep41"));
  assert.ok(result.blockReasons.includes("ledger-history-pruned-without-indexer"));
  assert.ok(result.blockReasons.includes("missing-recovery-seed"));
  assert.ok(result.blockReasons.includes("soroban-runtime-mismatch"));
  assert.ok(result.blockReasons.includes("execution-disabled"));
});
