import {test} from "node:test";
import assert from "node:assert/strict";
import {
 canonicalStellarAccountAddress,
 canonicalMuxedAccountAddress,
 canonicalMuxedContractAddress,
 parseStellarAddress,
 isContractStrKey,
 classifyPublicStellarAddress,
 preparePrivateTransfer,
 validCustomerDraft,
 canonicalPrivateReviewDraft,
 parseBusinessBatchCsv,
 validRecipientPresence,
 currentRecipientContract,
 validClassicRecipientPresence,
 currentClassicRecipient,
 StealthBridgeClient,
} from "../dist/index.js";

// Official test vectors generated with @stellar/stellar-sdk@17.4.0 (CAP-84 / SEP-23).
const G = "GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const C = "CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB";
const M = "MC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNWAAAAAAAAAAAAGDYO"; // id=1
const M_MAX = "MC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX7777777777775DTC"; // id=2^64-1
const M_ALT = "MAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB6EJCCD2H32MBCWAGQ"; // id=1234567890123456789
const M_ALT_BASE = "GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const W = "WDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW6AAAAAAAAAAAFKW6A"; // id=42
const W_ZERO = "WDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW6AAAAAAAAAAAACCWK"; // id=0
const W_MAX = "WDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW77777777777775SMG"; // id=2^64-1

// Non-zero trailing Base32 padding bit (char 68 bit 0 set to 1) must be rejected.
const W_BAD_PADDING_BIT = "WDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW6AAAAAAAAAAAFKW6B";
const M_BAD_PADDING_BIT = "MAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB6EJCCD2H32MBCWAGR";

test("parses canonical G, C, M, W StrKeys with exact underlying base addresses and uint64 mux IDs", () => {
 assert.deepEqual(parseStellarAddress(G), {
  address: G, kind: "classic", baseAddress: G, muxedId: null
 });
 assert.deepEqual(parseStellarAddress(C), {
  address: C, kind: "contract", baseAddress: C, muxedId: null
 });
 assert.deepEqual(parseStellarAddress(M), {
  address: M, kind: "muxed-classic", baseAddress: G, muxedId: "1"
 });
 assert.deepEqual(parseStellarAddress(M_MAX), {
  address: M_MAX, kind: "muxed-classic", baseAddress: G, muxedId: "18446744073709551615"
 });
 assert.deepEqual(parseStellarAddress(M_ALT), {
  address: M_ALT, kind: "muxed-classic", baseAddress: M_ALT_BASE, muxedId: "1234567890123456789"
 });
 assert.deepEqual(parseStellarAddress(W), {
  address: W, kind: "muxed-contract", baseAddress: C, muxedId: "42"
 });
 assert.deepEqual(parseStellarAddress(W_ZERO), {
  address: W_ZERO, kind: "muxed-contract", baseAddress: C, muxedId: "0"
 });
 assert.deepEqual(parseStellarAddress(W_MAX), {
  address: W_MAX, kind: "muxed-contract", baseAddress: C, muxedId: "18446744073709551615"
 });

 assert.equal(canonicalMuxedAccountAddress(" " + M.toLowerCase() + " "), M);
 assert.equal(canonicalMuxedContractAddress(" " + W.toLowerCase() + " "), W);
});

test("rejects corrupted checksums, wrong lengths, wrong prefixes and non-zero Base32 trailing bits", () => {
 for (const invalid of [
  W_BAD_PADDING_BIT,
  M_BAD_PADDING_BIT,
  "W" + C.slice(1),
  "M" + G.slice(1),
  W.slice(0, -1),
  M + "A",
  "W" + "A".repeat(68),
  "M" + "A".repeat(68),
  W.slice(0, -1) + "Z",
  M.slice(0, -1) + "Z",
  "S" + G.slice(1),
  "G" + "A".repeat(55),
  "C" + "A".repeat(55),
 ]) {
  assert.equal(parseStellarAddress(invalid), null, invalid);
  assert.equal(canonicalMuxedAccountAddress(invalid), null, invalid);
  assert.equal(canonicalMuxedContractAddress(invalid), null, invalid);
 }
 // Classic and raw-contract helpers remain strictly scoped to G and C.
 assert.equal(canonicalStellarAccountAddress(M), null);
 assert.equal(canonicalStellarAccountAddress(W), null);
 assert.equal(isContractStrKey(W), false);
 assert.equal(isContractStrKey(M), false);
});

test("classifies M and W recipients for private transfer, encrypted vault, review and CSV batch", () => {
 assert.deepEqual(classifyPublicStellarAddress(M), {
  address: M, kind: "muxed-classic", ownershipVerified: false, smartWalletCodeVerified: false
 });
 assert.deepEqual(classifyPublicStellarAddress(W), {
  address: W, kind: "muxed-contract-candidate", ownershipVerified: false, smartWalletCodeVerified: false
 });

 for (const recipient of [M, W]) {
  const prep = preparePrivateTransfer({
   sender: G, recipient, amount: "25.00", rail: "confidential-token", backendTestnetFresh: true
  });
  assert.equal(prep.validLocalDraft, true, recipient);
  assert.equal(prep.submissionAvailable, false);
  assert.equal(validCustomerDraft({
   kind: "personal", corridor_id: "a12ef783-d60b-4427-aa62-d2562acd4cef",
   recipient, amount: "10.5", reference: ""
  }), true, recipient);
  assert.ok(canonicalPrivateReviewDraft({
   corridorId: "a12ef783-d60b-4427-aa62-d2562acd4cef",
   originCountry: "NG", destinationCountry: "GB",
   assetCode: "USDC", assetIssuer: M_ALT_BASE,
   privacyRail: "confidential-token",
   sender: M_ALT_BASE, recipient, amount: "10.5", reference: "INV_P30"
  }).includes("recipient:" + recipient + "\n"));
 }

 // Sender must remain a classic G-address (M/W cannot be Freighter SEP-53/classic sender).
 assert.equal(preparePrivateTransfer({
  sender: M, recipient: W, amount: "10", rail: "private-payments", backendTestnetFresh: true
 }).validLocalDraft, false);

 // Business CSV accepts canonical G, C, M and W recipients, still rejecting non-canonical padding bit or whitespace.
 const csv = [
  "corridor_id,recipient,amount,reference",
  `11111111-2222-4333-8444-555555555555,${M},12.50,INV-M1`,
  `11111111-2222-4333-8444-555555555555,${W},15.00,INV-W1`
 ].join("\n");
 const batch = parseBusinessBatchCsv(csv);
 assert.equal(batch.rows.length, 2);
 assert.throws(() => parseBusinessBatchCsv(csv.replace(W, W_BAD_PADDING_BIT)), TypeError);
});

test("presence lookups resolve underlying G/C base addresses without inflating smart-account or mux trust", async () => {
 const now = 1800000000;
 const requests = [];
 const client = new StealthBridgeClient({
  apiBaseUrl: "/api/bridge",
  network: "testnet",
  fetchImpl: async (url) => {
   const path = String(url);
   requests.push(path);
   if (path.includes("/classic-recipient/")) {
    return new Response(JSON.stringify({
     schema_version: 1, network: "testnet", source: "stellar-horizon/account-presence",
     address: M, observed_at_unix: Math.floor(Date.now() / 1000),
     classic_account_found: true, ownership_verified: false,
     asset_acceptance_verified: false, payment_execution_enabled: false
    }), {headers: {"content-type": "application/json"}});
   }
   return new Response(JSON.stringify({
    schema_version: 1, network: "testnet", source: "stellar-rpc/recipient-presence",
    address: W, observed_at_unix: Math.floor(Date.now() / 1000),
    observed_ledger_sequence: 100, contract_instance_found: true,
    smart_account_verified: false, signer_authority_verified: false,
    recipient_asset_eligibility_verified: false, privacy_verified: false,
    payment_execution_enabled: false
   }), {headers: {"content-type": "application/json"}});
  }
 });

 const mOut = await client.classicRecipientPresence(M);
 assert.equal(mOut.classic_account_found, true);
 assert.equal(currentClassicRecipient({ ...mOut, observed_at_unix: now }, M, now), true);

 const wOut = await client.recipientPresence(W);
 assert.equal(wOut.contract_instance_found, true);
 assert.equal(validRecipientPresence({ ...wOut, observed_at_unix: now }, W, now), true);
 assert.equal(currentRecipientContract({ ...wOut, observed_at_unix: now }, W, now), true);

 assert.deepEqual(requests, [
  "/api/bridge/v1/wallet/classic-recipient/" + M,
  "/api/bridge/v1/wallet/recipient/" + W,
 ]);
});
