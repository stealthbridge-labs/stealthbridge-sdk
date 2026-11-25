/**
 * Passkey smart accounts: canonical request/response contracts for
 * `/v1/account/smart-accounts/deployments` and WebAuthn key helpers.
 * Pure functions only; usable in Node.js and browsers.
 *
 * A deployment record is shown as "deployed" only when the backend observed
 * a successful factory transaction on Stellar Testnet. The passkey's private
 * key never leaves the authenticator; only its public key is sent.
 */

export type DeploymentStatus = "submitted" | "deployed" | "failed";

export type SmartAccountDeployment = {
  contract_address: string;
  label: string;
  owner_public_key: string;
  credential_id: string;
  rp_id: string;
  guardian_address: string | null;
  factory_address: string;
  tx_hash: string;
  status: DeploymentStatus;
  ledger: number | null;
  created_at_unix: number;
};

export type DeploymentDirectory = {
  schema_version: 1;
  network: "testnet";
  account_address: string;
  relayer_configured: boolean;
  max_deployments: number;
  deployments: SmartAccountDeployment[];
};

export type DeployRequest = {
  label: string;
  public_key_hex: string;
  credential_id: string;
  wallet_guardian: boolean;
};

const C_ADDR = /^C[A-Z2-7]{55}$/;
const G_ADDR = /^G[A-Z2-7]{55}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const P256_HEX = /^04[0-9a-f]{128}$/;
const CRED = /^[A-Za-z0-9_-]{16,256}$/;

const exact = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));

export function validLabel(label: unknown): label is string {
  return typeof label === "string" && label.trim().length >= 1 && label.trim().length <= 48 && !/[<>\p{Cc}]/u.test(label);
}

export function validDeployRequest(v: unknown): v is DeployRequest {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return (
    exact(r, ["label", "public_key_hex", "credential_id", "wallet_guardian"]) &&
    validLabel(r.label) &&
    typeof r.public_key_hex === "string" && P256_HEX.test(r.public_key_hex) &&
    typeof r.credential_id === "string" && CRED.test(r.credential_id) &&
    typeof r.wallet_guardian === "boolean"
  );
}

function validDeployment(v: unknown): v is SmartAccountDeployment {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const d = v as Record<string, unknown>;
  return (
    exact(d, ["contract_address", "label", "owner_public_key", "credential_id", "rp_id", "guardian_address",
      "factory_address", "tx_hash", "status", "ledger", "created_at_unix"]) &&
    typeof d.contract_address === "string" && C_ADDR.test(d.contract_address) &&
    validLabel(d.label) &&
    typeof d.owner_public_key === "string" && P256_HEX.test(d.owner_public_key) &&
    typeof d.credential_id === "string" && CRED.test(d.credential_id) &&
    typeof d.rp_id === "string" && d.rp_id.length >= 3 &&
    (d.guardian_address === null || (typeof d.guardian_address === "string" && G_ADDR.test(d.guardian_address))) &&
    typeof d.factory_address === "string" && C_ADDR.test(d.factory_address) &&
    typeof d.tx_hash === "string" && HEX64.test(d.tx_hash) &&
    (d.status === "submitted" || d.status === "deployed" || d.status === "failed") &&
    // "deployed" must carry the ledger it was observed in.
    (d.status === "deployed" ? Number.isSafeInteger(d.ledger) && (d.ledger as number) > 0 : d.ledger === null || Number.isSafeInteger(d.ledger)) &&
    Number.isSafeInteger(d.created_at_unix) && (d.created_at_unix as number) > 0
  );
}

export function validDeploymentDirectory(v: unknown, account: string): v is DeploymentDirectory {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const d = v as Record<string, unknown>;
  return (
    exact(d, ["schema_version", "network", "account_address", "relayer_configured", "max_deployments", "deployments"]) &&
    d.schema_version === 1 && d.network === "testnet" && d.account_address === account &&
    typeof d.relayer_configured === "boolean" &&
    Number.isSafeInteger(d.max_deployments) &&
    Array.isArray(d.deployments) && d.deployments.length <= 10 && d.deployments.every(validDeployment)
  );
}

// ---------------------------------------------------------------- WebAuthn

/** DER SubjectPublicKeyInfo prefix for an uncompressed P-256 (ES256) key. */
const P256_SPKI_PREFIX = "3059301306072a8648ce3d020106082a8648ce3d030107034200";

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** Extracts 04||X||Y from a P-256 SPKI; rejects every other key type. */
export function p256PointFromSpki(spki: ArrayBuffer | Uint8Array): string | null {
  const bytes = spki instanceof Uint8Array ? spki : new Uint8Array(spki);
  if (bytes.length !== 91) return null;
  const hex = toHex(bytes);
  if (!hex.startsWith(P256_SPKI_PREFIX)) return null;
  const point = hex.slice(P256_SPKI_PREFIX.length);
  return P256_HEX.test(point) ? point : null;
}

export function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
