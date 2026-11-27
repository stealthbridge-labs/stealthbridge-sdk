import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  OZ_SMART_ACCOUNTS_TESTNET,
  passkeyKeyData,
  passkeyDeploySalt,
  walletAddressFromSalt,
  predictPasskeyWallet,
  validRelaySubmission,
  validRelayResponse,
  strkeyPayload,
} from "../dist/index.js";

// A real kit-shaped deployment that Stellar Testnet RPC simulated successfully
// on 2026-11-26 (nothing broadcast). Its predicted wallet came from the simulation.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/oz-kit-deploy.testnet.json", import.meta.url), "utf8"));
const SIMULATED_WALLET = "CA3ZH3XCTJQS5RD74VYVDMU3TEENHOKXYODBDOIG5ICE4A5XKCYEJE6B";
const func = Buffer.from(fixture.func, "base64");

test("pinned Testnet artifacts are well-formed StrKeys and hashes", () => {
  const t = OZ_SMART_ACCOUNTS_TESTNET;
  assert.match(t.accountWasmHash, /^[a-f0-9]{64}$/);
  for (const c of [t.webauthnVerifier, t.ed25519Verifier, ...Object.values(t.policies)]) {
    assert.equal(strkeyPayload(c)?.kind, "C", c);
  }
  assert.equal(strkeyPayload(t.sharedDeployer)?.kind, "G");
  assert.ok(Object.isFrozen(t) && Object.isFrozen(t.policies));
});

test("wallet address derivation matches the address Testnet simulation predicted", async () => {
  // HostFunction(createContractV2=3) ‖ ContractIdPreimage(Address=0) ‖ ScAddress(Account=0) ‖ PublicKey(ed25519=0) ‖ 32 ‖ salt
  assert.equal(func.readUInt32BE(0), 3);
  assert.equal(func.subarray(16, 48).equals(Buffer.from(strkeyPayload(OZ_SMART_ACCOUNTS_TESTNET.sharedDeployer).bytes)), true);
  const salt = new Uint8Array(func.subarray(48, 80));
  assert.equal(await walletAddressFromSalt(salt), SIMULATED_WALLET);
  // A different network gives a different address (no cross-network reuse).
  assert.notEqual(await walletAddressFromSalt(salt, "Public Global Stellar Network ; September 2015"), SIMULATED_WALLET);
});

test("salt binds the wallet to its first passkey credential", async () => {
  const cred = new TextEncoder().encode("credential-1");
  const salt = await passkeyDeploySalt(cred);
  assert.equal(salt.length, 32);
  assert.equal(await predictPasskeyWallet(cred), await walletAddressFromSalt(salt));
  assert.notEqual(await predictPasskeyWallet(new TextEncoder().encode("credential-2")), await predictPasskeyWallet(cred));
});

test("passkey key data is the uncompressed point followed by the credential id", () => {
  const pub = new Uint8Array(65); pub[0] = 4;
  const kd = passkeyKeyData(pub, new Uint8Array([7, 8, 9]));
  assert.equal(kd.length, 68);
  assert.deepEqual([...kd.subarray(65)], [7, 8, 9]);
  assert.throws(() => passkeyKeyData(new Uint8Array(33), new Uint8Array([1])));
  assert.throws(() => passkeyKeyData(pub, new Uint8Array()));
});

test("relay submissions: the kit's exact {func, auth} shape only", () => {
  assert.equal(validRelaySubmission(fixture), true);
  assert.equal(validRelaySubmission({ ...fixture, xdr: "AAAA" }), false);
  assert.equal(validRelaySubmission({ func: fixture.func, auth: [] }), false);
  assert.equal(validRelaySubmission({ func: fixture.func, auth: Array(9).fill(fixture.auth[0]) }), false);
  assert.equal(validRelaySubmission({ func: "not base64!", auth: fixture.auth }), false);
});

test("relay responses distinguish accepted, ambiguous and refused", () => {
  const hash = "b".repeat(64);
  assert.equal(validRelayResponse({ success: true, hash, status: "submitted", kind: "deploy" }), true);
  assert.equal(validRelayResponse({ success: true, hash, status: "pending", kind: "transfer" }), true);
  assert.equal(validRelayResponse({ success: true, hash, status: "confirmed", kind: "transfer" }), false);
  assert.equal(validRelayResponse({ success: true, hash: "xyz", status: "submitted", kind: "wallet" }), false);
  assert.equal(validRelayResponse({ success: false, error: "WALLET_NOT_ALLOWED", errorCode: "WALLET_NOT_ALLOWED" }), true);
  assert.equal(validRelayResponse({ success: false, error: "<script>", errorCode: "<script>" }), false);
});
