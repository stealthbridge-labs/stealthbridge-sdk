/**
 * The two StealthBridge privacy rails as separate, typed capabilities
 * (workspace ADR-0007). Values mirror the canonical lock in
 * stealthbridge-contracts `integrations/privacy-dependency-lock.v2.json`
 * (CI fails on drift: scripts/check-privacy-lock.mjs).
 *
 * There is deliberately no `privateTransfer()`: Personal (shielded pool) and
 * Business (confidential token) hide different things, have different
 * lifecycles and fail differently. Draft encryption and public Stellar
 * transfers are not privacy rails at all.
 *
 * Both rails are NO_GO. `assertRailEnabled` refuses to proceed while the lock
 * says so; a caller cannot opt out.
 */

export type PrivacyRailId = "personal-shielded-pool" | "business-confidential-token";
export type Visibility = "public" | "hidden" | "auditor-only" | "operator-visible";

/** What a passive observer of the ledger (and of an indexer) can see, per field. */
export interface DisclosureModel {
  readonly operation: string;
  readonly fields: Readonly<Record<string, Visibility>>;
  readonly notes: readonly string[];
}

export interface PersonalPool {
  readonly id: string;
  readonly asset: string;
  readonly token: string;
  readonly wasmSha256: string;
  readonly policy: "blocklist";
  readonly globalViewKey: "off" | "traceable" | "viewOnly";
}

const PERSONAL_POOLS: readonly PersonalPool[] = Object.freeze([
  { id: "CCW3LL6DAYESXPLCI5XVHYAM2I6XOW7PUAZLXDH4UAVETQN332B5XIHL", asset: "XLM", token: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", wasmSha256: "830977a55b6e28ba8388fde5e4ffaa67dba6bbaca5e9d4cd94c2f644bb4c41fb", policy: "blocklist", globalViewKey: "off" },
  { id: "CAJAMQMMM5CMRY6OOHFAZSDN2UXX5ACXGF2VANERZLXWTUMCDICYW6TO", asset: "XLM", token: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", wasmSha256: "0b03494796e66c2df3e731a0bfa34c62194d91ef95e409f6d7ba694abe081165", policy: "blocklist", globalViewKey: "traceable" },
  { id: "CAP74XRK6XWUYL2BTVWHUBUPOB5UHXFDRNK6LAFP42RRC7EWYORFSFZH", asset: "XLM", token: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", wasmSha256: "0b03494796e66c2df3e731a0bfa34c62194d91ef95e409f6d7ba694abe081165", policy: "blocklist", globalViewKey: "viewOnly" },
  { id: "CBQNV6RSE42CUKGWYCPPWKALTKCQJFDJKGAFYCICZJ7DO6JMCUCZRYWX", asset: "EURC:GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO", token: "CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ", wasmSha256: "830977a55b6e28ba8388fde5e4ffaa67dba6bbaca5e9d4cd94c2f644bb4c41fb", policy: "blocklist", globalViewKey: "off" },
].map((p) => Object.freeze(p as PersonalPool)));

export const PERSONAL_SHIELDED_POOL = Object.freeze({
  rail: "personal-shielded-pool" as const,
  network: "testnet" as const,
  upstream: "NethermindEth/stellar-private-payments",
  deploymentCommit: "25f64658e5c26e0f7aac4b35e68f0fed1507cb83",
  proofSystem: "Groth16/BN254 (Circom), Poseidon2",
  trustedSetup: "local (single party)" as const,
  pools: PERSONAL_POOLS,
  /** Verified by in-process evidence (stealthbridge-contracts integrations/evidence). */
  smartAccountAuthorization: Object.freeze({
    root: "pool.transact(proof, ext_data, sender)",
    depositSubInvocation: "SAC.transfer(sender -> pool, ext_amount)",
    contexts: 2,
  }),
  verdict: "NO_GO" as "GO" | "NO_GO",
  blockers: Object.freeze([
    "Single-party (setup=local) Groth16 trusted setup for every circuit.",
    "Upstream code unaudited; pools, admin and association sets operated by a third party.",
    "Upstream client deposit-flow tests fail at the pinned commit.",
    "Durable note and event indexing beyond the ~7-day RPC event window not built.",
  ]),
  disclosure: Object.freeze<DisclosureModel[]>([
    { operation: "deposit", fields: { depositor: "public", amount: "public", time: "public", feePayer: "public", pool: "public", noteOwner: "hidden" },
      notes: ["A deposit is a public token transfer into the pool; privacy starts inside the pool."] },
    { operation: "shielded-transfer", fields: { sender: "hidden", recipient: "hidden", amount: "hidden", time: "public", feePayer: "public", transactionPresence: "public", pool: "public" },
      notes: ["Nullifiers, commitments and encrypted outputs are public but unlinkable without keys.", "View-key pools (traceable/viewOnly) let the view-key authority see more."] },
    { operation: "withdrawal", fields: { recipient: "public", amount: "public", time: "public", feePayer: "public", noteOrigin: "hidden" },
      notes: ["Timing and amount correlation with earlier deposits can still link users in a small anonymity set."] },
  ]),
});

export const BUSINESS_CONFIDENTIAL_TOKEN = Object.freeze({
  rail: "business-confidential-token" as const,
  network: "testnet" as const,
  upstream: "OpenZeppelin/stellar-contracts",
  release: "v0.8.0 (ddc327eb92d63709436da3a8455f641c2d5476c5)",
  proofSystem: "UltraHonk; Pedersen commitments on Grumpkin",
  trustedSetup: "none (universal SRS)" as const,
  deployments: Object.freeze([] as string[]),
  clientSdk: "none official (specification and conformance vectors only)",
  verdict: "NO_GO" as "GO" | "NO_GO",
  blockers: Object.freeze([
    "No reviewed client implementation.",
    "No Testnet deployment to integrate against.",
    "Audited at snapshot 2128f11; the release delta and client layer are unaudited.",
  ]),
  disclosure: Object.freeze<DisclosureModel[]>([
    { operation: "confidential-transfer", fields: { sender: "public", recipient: "public", amount: "hidden", balances: "hidden", auditorView: "auditor-only", time: "public" },
      notes: ["Confidentiality, not anonymity: counterparties stay public.", "Registered auditors can decrypt amounts."] },
    { operation: "deposit-or-withdraw", fields: { account: "public", amount: "public", time: "public" },
      notes: ["Moving value into or out of confidential balances is a public edge."] },
  ]),
});

/** Lifecycle of a Personal-rail operation; each state is observable and recoverable. */
export type PersonalOperationState =
  | "keys-required" | "syncing" | "proving" | "awaiting-signature" | "simulating"
  | "submitted" | "confirmed" | "failed";

export class PrivacyRailUnavailableError extends Error {
  readonly rail: PrivacyRailId;
  readonly blockers: readonly string[];
  constructor(rail: PrivacyRailId, blockers: readonly string[]) {
    super(`${rail} is NO_GO: ${blockers[0] ?? "release gates not met"}`);
    this.name = "PrivacyRailUnavailableError";
    this.rail = rail;
    this.blockers = blockers;
  }
}

/** Throws while the canonical lock marks the rail NO_GO. There is no override. */
export function assertRailEnabled(rail: PrivacyRailId): void {
  const spec = rail === "personal-shielded-pool" ? PERSONAL_SHIELDED_POOL : BUSINESS_CONFIDENTIAL_TOKEN;
  if (spec.verdict !== "GO") throw new PrivacyRailUnavailableError(rail, spec.blockers);
}

export function personalPool(id: string): PersonalPool | null {
  return PERSONAL_POOLS.find((p) => p.id === id) ?? null;
}

export function disclosureFor(rail: PrivacyRailId, operation: string): DisclosureModel | null {
  const spec = rail === "personal-shielded-pool" ? PERSONAL_SHIELDED_POOL : BUSINESS_CONFIDENTIAL_TOKEN;
  return spec.disclosure.find((d) => d.operation === operation) ?? null;
}
