#!/usr/bin/env node
// Offline consistency audit ONLY. Never authorizes on-chain calls or payments.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const PASSPHRASE = "Test SDF Network ; September 2015";
const names = ["corridor-registry", "policy-registry", "governance-gate"];
const hex64 = /^[0-9a-f]{64}$/;
const strkey = /^C[A-Z2-7]{55}$/;
const account = /^G[A-Z2-7]{55}$/;

export function checkGovernanceObservation(evidence) {
  const failures = [];
  const fail = (why) => failures.push(why);
  if (evidence?.schemaVersion !== 2 || evidence?.recordType !== "soroban-testnet-governance-deployment-observation") fail("wrong observation schema");
  if (evidence?.network !== "testnet" || evidence?.networkPassphrase !== PASSPHRASE) fail("wrong network");
  if (!account.test(evidence?.administrator ?? "") || evidence?.deployer !== evidence?.administrator) fail("invalid operator binding");
  const c = evidence?.contracts ?? {};
  const seen = new Set();
  for (const name of names) {
    const contract = c[name];
    if (!contract || !strkey.test(contract.contractId ?? "")) fail(name + ": invalid contract ID");
    else if (seen.has(contract.contractId)) fail(name + ": duplicate contract ID");
    else seen.add(contract.contractId);
    for (const field of ["wasmSha256", "abiSha256", "deploymentTx"]) {
      if (!hex64.test(contract?.[field] ?? "")) fail(name + ": invalid " + field);
    }
    if (!Number.isSafeInteger(contract?.deploymentLedger) || contract.deploymentLedger <= 0) fail(name + ": invalid ledger");
    if (contract?.readbackWasmMatches !== true) fail(name + ": no WASM readback evidence");
    if (contract?.observedAdmin !== evidence?.administrator) fail(name + ": operator mismatch");
  }
  if (c["governance-gate"]?.observedCorridorRegistry !== c["corridor-registry"]?.contractId) fail("gate corridor binding mismatch");
  if (c["governance-gate"]?.observedPolicyRegistry !== c["policy-registry"]?.contractId) fail("gate policy binding mismatch");
  if (c["corridor-registry"]?.observedPaused !== false || c["policy-registry"]?.observedPaused !== false) fail("paused or unknown registry observation");
  if (evidence?.scope?.paymentExecutionEnabled !== false || evidence?.scope?.platformFeesEnabled !== false || evidence?.scope?.privacyVerified !== false || evidence?.scope?.fiatPayoutEnabled !== false) fail("unsafe financial capability claim");
  if (evidence?.verification?.independentExternalAuditCompleted !== false) fail("unexpected audit claim");
  return { consistent: failures.length === 0, failures, trustedForLiveCalls: false, paymentExecutionEnabled: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const evidence = JSON.parse(readFileSync(process.argv[2], "utf8"));
    const result = checkGovernanceObservation(evidence);
    console.log(JSON.stringify(result, null, 2));
    if (!result.consistent) process.exitCode = 1;
  } catch (error) {
    console.error("Observation audit failed:", error.message);
    process.exitCode = 1;
  }
}
