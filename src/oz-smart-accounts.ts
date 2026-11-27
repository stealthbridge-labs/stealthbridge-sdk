/**
 * OpenZeppelin smart accounts on Stellar (stellar-accounts v0.8.0), as used by
 * stellar/smart-account-kit 0.10.0 and sponsored by the StealthBridge relay.
 *
 * Every identifier below was verified on Stellar Testnet on 2026-11-26:
 * - the account WASM fetched by hash and re-hashed (48,273 bytes);
 * - each verifier and policy instance read from the ledger;
 * - the shared deployer derived with @stellar/stellar-sdk and matched against
 *   the kit's deployment record.
 * The account WASM is uploaded once and every wallet is its own instance, so
 * StealthBridge deploys no custom account code.
 *
 * Dependency-free: Web Crypto only.
 */
import { strkeyPayload } from "./smart-account-payments.js";
import { encodeContractAddress } from "./wallet.js";

export const OZ_SMART_ACCOUNTS_TESTNET = Object.freeze({
  network: "testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  stellarAccountsVersion: "0.8.0",
  smartAccountKitVersion: "0.10.0",
  /** stellar-accounts ≥ v0.8.0 signs AuthDigestPreimage{account, signature_payload, context_rule_ids}. */
  authDigestScheme: "preimage-v1",
  accountWasmHash: "c514d35ea67eaea9bfc1fb3327854c0c06111bc1ddebd4fe217c504c1004b9e1",
  accountWasmSize: 48273,
  webauthnVerifier: "CC7EKIHQP3TN4CARQDND6CEOY2UXLWWC2X5GHTD5NLAT7BG5GPZIOM3F",
  ed25519Verifier: "CAAVTMCBXEIBPR64EAASKFXERVPYFZA2JYP5A3BG6PESWEFUJX5IHKN4",
  policies: Object.freeze({
    threshold: "CAZ2WFUDXGX265LOEARFEOYYUL6F4BYWXZLGUAWZNJY3MRFPNLSZVS4S",
    weightedThreshold: "CDBYLFLUNPAYGE3AHZSMB4TFWECFCCHX6CJFMFO6HRPKK2W5PFU2LCKE",
    spendingLimit: "CC3CEYQAP6NPNFIYSWL5MVZRCPJZGWX4XO7WDEJOUVGO2FZX5OONYPA5",
  }),
  /** Public deterministic key from sha256("openzeppelin-smart-account-kit"); never a fee source. */
  sharedDeployer: "GAAH4OT36RRCCAGKARGPN2HLHT2NOBVFHO4GUHA6CF7UKQ4MMV24WQ4N",
  /** StealthBridge backend route (reached through the session-authenticated BFF). */
  relayPath: "/v1/account/smart-accounts/oz/relay",
});

const MAX_AUTH_ENTRIES = 8;
const MAX_XDR_B64 = 64 * 1024;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

const u32 = (n: number) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n);
  return b;
};
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function sha256(b: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", b as Uint8Array<ArrayBuffer>));
}

/**
 * Key data of an `External(webauthnVerifier, keyData)` passkey signer:
 * the uncompressed P-256 point (0x04‖X‖Y, 65 bytes) followed by the credential id.
 */
export function passkeyKeyData(publicKey: Uint8Array, credentialId: Uint8Array): Uint8Array {
  if (publicKey.length !== 65 || publicKey[0] !== 0x04) throw new TypeError("Passkey public key must be an uncompressed P-256 point");
  if (credentialId.length < 1 || credentialId.length > 1023) throw new TypeError("Invalid WebAuthn credential id");
  return concat(publicKey, credentialId);
}

/** The kit binds each wallet's address to its first passkey: salt = sha256(credential id). */
export function passkeyDeploySalt(credentialId: Uint8Array): Promise<Uint8Array> {
  return sha256(credentialId);
}

/**
 * The C… address a wallet will have, before deployment:
 * sha256(HashIdPreimage::ContractId{network_id, ContractIdPreimage::Address{shared deployer, salt}}).
 */
export async function walletAddressFromSalt(
  salt: Uint8Array,
  networkPassphrase: string = OZ_SMART_ACCOUNTS_TESTNET.networkPassphrase,
  deployer: string = OZ_SMART_ACCOUNTS_TESTNET.sharedDeployer,
): Promise<string> {
  if (salt.length !== 32) throw new TypeError("Salt must be 32 bytes");
  const d = strkeyPayload(deployer);
  if (!d || d.kind !== "G") throw new TypeError("Deployer must be a G… account");
  const networkId = await sha256(new TextEncoder().encode(networkPassphrase));
  // ENVELOPE_TYPE_CONTRACT_ID = 8; CONTRACT_ID_PREIMAGE_FROM_ADDRESS = 0;
  // SC_ADDRESS_TYPE_ACCOUNT = 0; PUBLIC_KEY_TYPE_ED25519 = 0.
  const id = await sha256(concat(u32(8), networkId, u32(0), u32(0), u32(0), d.bytes, salt));
  const address = encodeContractAddress(id);
  if (!address) throw new Error("Could not encode contract address");
  return address;
}

export async function predictPasskeyWallet(credentialId: Uint8Array, networkPassphrase?: string): Promise<string> {
  return walletAddressFromSalt(await passkeyDeploySalt(credentialId), networkPassphrase);
}

/** The smart-account-kit `{func, auth}` relay body (base64 XDR). Shape only: the backend decodes and validates. */
export interface RelaySubmission { func: string; auth: string[] }

export function validRelaySubmission(v: unknown): v is RelaySubmission {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o);
  const b64 = (s: unknown) => typeof s === "string" && s.length > 0 && s.length <= MAX_XDR_B64 && s.length % 4 === 0 && B64.test(s);
  return keys.length === 2 && keys.includes("func") && keys.includes("auth") &&
    b64(o.func) && Array.isArray(o.auth) && o.auth.length >= 1 && o.auth.length <= MAX_AUTH_ENTRIES && o.auth.every(b64);
}

export type RelayResponse =
  | { success: true; hash: string; status: "submitted" | "pending"; kind: "deploy" | "transfer" | "wallet" }
  | { success: false; error: string; errorCode: string };

/**
 * A relay reply. `status: "pending"` means the network's answer was ambiguous:
 * the transaction may still land, and only a ledger read can settle it.
 */
export function validRelayResponse(v: unknown): v is RelayResponse {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (o.success === true) {
    return typeof o.hash === "string" && /^[a-f0-9]{64}$/.test(o.hash) &&
      (o.status === "submitted" || o.status === "pending") &&
      (o.kind === "deploy" || o.kind === "transfer" || o.kind === "wallet");
  }
  return o.success === false && typeof o.error === "string" && /^[A-Z][A-Z0-9_]{1,63}$/.test(o.error) &&
    o.errorCode === o.error;
}
