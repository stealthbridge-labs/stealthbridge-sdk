import { canonicalStellarAccountAddress, parseStellarAddress } from "./wallet.js";

export type LifecycleState =
  | "instruction_created"
  | "corridor_verified"
  | "asset_recipient_verified"
  | "quote_unavailable"
  | "quoted"
  | "policy_verified"
  | "customer_authorized"
  | "privacy_proof_pending"
  | "privacy_proof_verified"
  | "tx_submitted"
  | "chain_finalized"
  | "chain_failed"
  | "payout_pending"
  | "payout_completed"
  | "payout_failed"
  | "dispute_open"
  | "reversal_pending"
  | "reversed"
  | "reconciled"
  | "expired"
  | "cancelled";

export interface CreateSettlementLifecycleInput {
  id: string;
  organization_id: string | null;
  instruction_id: string | null;
  corridor_id: string;
  route_fingerprint: string;
  idempotency_key: string;
  asset_code: string;
  asset_issuer: string | null;
  amount_minor_units: number;
  recipient_address: string;
  privacy_rail: "private-payments" | "confidential-token";
  expires_in_seconds: number;
}

export interface SettlementLifecycleEvent {
  revision: number;
  previous_state: LifecycleState | null;
  next_state: LifecycleState;
  reason_code: string;
  tx_hash: string | null;
  recorded_at_unix: number;
}

export interface SettlementLifecycleRecord {
  id: string;
  organization_id: string | null;
  instruction_id: string | null;
  corridor_id: string;
  route_fingerprint: string;
  idempotency_key: string;
  request_sha256: string;
  asset_code: string;
  asset_issuer: string | null;
  amount_minor_units: number;
  recipient_address: string;
  recipient_kind: "classic" | "muxed-classic" | "contract" | "muxed-contract";
  privacy_rail: "private-payments" | "confidential-token";
  privacy_rail_verified: boolean;
  quote_status: "unavailable" | "provider_verified";
  quote_sha256: string | null;
  policy_commitment_sha256: string | null;
  customer_auth_sha256: string | null;
  state: LifecycleState;
  revision: number;
  expires_at_unix: number;
  testnet_tx_hash: string | null;
  observed_ledger: number | null;
  observed_at_unix: number | null;
  chain_status: "SUCCESS" | "FAILED" | null;
  payout_status: "unavailable" | "pending" | "completed" | "failed" | "reversed";
  reconciliation_status: "pending" | "matched" | "disputed" | "reversed";
  last_error_code: string | null;
  created_at_unix: number;
  updated_at_unix: number;
  events: SettlementLifecycleEvent[];
}

export interface SettlementLifecycleDirectory {
  schema_version: 1;
  network: "testnet";
  source: "account-settlement-lifecycles";
  account_address: string;
  observed_at_unix: number;
  items: SettlementLifecycleRecord[];
  mainnet_enabled: false;
  live_fx_enabled: false;
  fiat_payouts_enabled: false;
}

export type SettlementLifecycleAction =
  | { action: "verify_policy"; id: string; expected_revision: number; policy_commitment_sha256: string }
  | {
      action: "authorize";
      id: string;
      expected_revision: number;
      customer_auth_sha256: string;
      ed25519_signature_hex?: string | null;
      acknowledge_transparent_testnet_only: boolean;
      privacy_rail_proof_verified: boolean;
    }
  | { action: "submit_tx"; id: string; expected_revision: number; testnet_tx_hash: string }
  | { action: "observe_tx"; id: string; expected_revision: number }
  | { action: "retry"; id: string; expected_revision: number }
  | { action: "open_dispute"; id: string; expected_revision: number; reason_code: string }
  | { action: "request_reversal"; id: string; expected_revision: number; reason_code: string }
  | { action: "confirm_reversal"; id: string; expected_revision: number; reason_code: string }
  | { action: "reconcile"; id: string; expected_revision: number }
  | { action: "cancel"; id: string; expected_revision: number };

const TRANSITIONS: Record<LifecycleState, readonly LifecycleState[]> = {
  instruction_created: ["corridor_verified", "cancelled", "expired"],
  corridor_verified: ["asset_recipient_verified", "cancelled", "expired"],
  asset_recipient_verified: ["quote_unavailable", "quoted", "cancelled", "expired"],
  quote_unavailable: ["policy_verified", "cancelled", "expired"],
  quoted: ["policy_verified", "cancelled", "expired"],
  policy_verified: ["customer_authorized", "cancelled", "expired"],
  customer_authorized: ["privacy_proof_pending", "privacy_proof_verified", "cancelled", "expired"],
  privacy_proof_pending: ["privacy_proof_verified", "cancelled", "expired"],
  privacy_proof_verified: ["tx_submitted"],
  tx_submitted: ["chain_finalized", "chain_failed"],
  chain_finalized: ["payout_pending", "reconciled", "dispute_open"],
  chain_failed: ["customer_authorized", "dispute_open", "reversal_pending"],
  payout_pending: ["payout_completed", "payout_failed", "dispute_open"],
  payout_completed: ["reconciled", "dispute_open"],
  payout_failed: ["payout_pending", "dispute_open", "reversal_pending"],
  dispute_open: ["reversal_pending", "reconciled"],
  reversal_pending: ["reversed"],
  reversed: [],
  reconciled: [],
  expired: [],
  cancelled: [],
};

const UUID_RE = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const HEX64_RE = /^[0-9a-f]{64}$/;
const rec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isUuid = (v: unknown): v is string =>
  typeof v === "string" && UUID_RE.test(v) && v !== "00000000-0000-0000-0000-000000000000";

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function allowedSettlementLifecycleTransitions(state: LifecycleState): readonly LifecycleState[] {
  return TRANSITIONS[state] ?? [];
}

export function canTransitionSettlementLifecycle(from: LifecycleState, to: LifecycleState): boolean {
  return allowedSettlementLifecycleTransitions(from).includes(to);
}

export async function canonicalSettlementIntentDigest(
  account: string,
  input: CreateSettlementLifecycleInput,
): Promise<string> {
  if (canonicalStellarAccountAddress(account) !== account || !parseStellarAddress(input.recipient_address)) {
    throw new TypeError("Invalid Stellar address");
  }
  const text =
    `StealthBridge settlement intent v1\n${account}\n${input.organization_id ?? ""}\n` +
    `${input.instruction_id ?? ""}\n${input.corridor_id}\n${input.route_fingerprint}\n` +
    `${input.asset_code}\n${input.asset_issuer ?? ""}\n${input.amount_minor_units}\n` +
    `${input.recipient_address}\n${input.privacy_rail}\n`;
  return sha256Hex(text);
}

export async function canonicalCustomerAuthorizationDigest(
  account: string,
  requestSha256: string,
): Promise<string> {
  if (canonicalStellarAccountAddress(account) !== account || !HEX64_RE.test(requestSha256)) {
    throw new TypeError("Invalid authorization inputs");
  }
  return sha256Hex(`stealthbridge-auth-v1\n${account}\n${requestSha256}\n`);
}

export function validSettlementLifecycleDirectory(
  v: unknown,
  account: string,
): v is SettlementLifecycleDirectory {
  if (
    !rec(v) ||
    canonicalStellarAccountAddress(account) !== account ||
    v.schema_version !== 1 ||
    v.network !== "testnet" ||
    v.source !== "account-settlement-lifecycles" ||
    v.account_address !== account ||
    v.mainnet_enabled !== false ||
    v.live_fx_enabled !== false ||
    v.fiat_payouts_enabled !== false ||
    !Array.isArray(v.items) ||
    v.items.length > 50
  ) {
    return false;
  }
  for (const row of v.items) {
    if (
      !rec(row) ||
      !isUuid(row.id) ||
      !isUuid(row.corridor_id) ||
      typeof row.request_sha256 !== "string" ||
      !HEX64_RE.test(row.request_sha256) ||
      typeof row.state !== "string" ||
      !(row.state in TRANSITIONS) ||
      !Array.isArray(row.events)
    ) {
      return false;
    }
  }
  return true;
}

export class SettlementLifecycleError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 409
        ? "Settlement state changed, expired, or idempotency payload conflicted. Refresh and retry."
        : status === 401
          ? "Sign in again to access controlled Testnet settlement lifecycles."
          : status === 502
            ? "Stellar Testnet RPC observation could not verify this transaction yet."
            : status === 422
              ? "That transaction is not this settlement's payment: the payer, recipient, asset and amount must all match."
              : "Settlement lifecycle service is unavailable.",
    );
    this.name = "SettlementLifecycleError";
  }
}

type RequestOptions = { fetchImpl?: typeof fetch; signal?: AbortSignal };

async function bffCall(method: string, body: unknown, options: RequestOptions): Promise<Response> {
  const response = await (options.fetchImpl ?? fetch)("/api/account/settlements", {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal ?? AbortSignal.timeout(10_000),
    ...(method === "GET"
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new SettlementLifecycleError(response.status);
  }
  return response;
}

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new TypeError("Unexpected settlement content type");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new TypeError("Empty settlement body");
  let size = 0;
  const parts: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 260_000) throw new TypeError("Settlement response too large");
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let pos = 0;
  for (const p of parts) {
    bytes.set(p, pos);
    pos += p.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function listSettlementLifecycles(
  account: string,
  options: RequestOptions = {},
): Promise<SettlementLifecycleDirectory> {
  if (canonicalStellarAccountAddress(account) !== account) throw new TypeError("Invalid account");
  const data = await boundedJson(await bffCall("GET", null, options));
  if (!validSettlementLifecycleDirectory(data, account)) {
    throw new TypeError("Invalid settlement lifecycle response");
  }
  return data;
}

export async function createSettlementLifecycle(
  input: CreateSettlementLifecycleInput,
  options: RequestOptions = {},
): Promise<Record<string, unknown>> {
  const data = await boundedJson(await bffCall("PUT", input, options));
  if (!rec(data) || !isUuid(data.id)) throw new TypeError("Invalid created settlement payload");
  return data;
}

export async function advanceSettlementLifecycle(
  action: SettlementLifecycleAction,
  options: RequestOptions = {},
): Promise<Record<string, unknown>> {
  const data = await boundedJson(await bffCall("POST", action, options));
  if (!rec(data) || !isUuid(data.id)) throw new TypeError("Invalid settlement action payload");
  return data;
}
