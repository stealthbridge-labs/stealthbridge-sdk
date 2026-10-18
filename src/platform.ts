/** Public read-only product scope, not a payment/authorization capability. */
export type PlatformModuleId =
  | "wallet" | "corridors" | "quotes" | "payments" | "batch-payouts"
  | "approvals" | "reconciliation" | "webhooks" | "privacy-proofs"
  | "disclosure" | "partner-settlement";
export type PlatformAvailability = "metadata-only" | "planned" | "blocked";
export type PlatformAudience = "consumer" | "business" | "developer" | "partner";
export interface PlatformModule {
  id: PlatformModuleId;
  audiences: PlatformAudience[];
  availability: PlatformAvailability;
  description: string;
}
export interface PlatformCatalog {
  product: "StealthBridge";
  network: "testnet";
  payment_execution_enabled: false;
  privacy_verified: false;
  mainnet_enabled: false;
  modules: PlatformModule[];
}
const IDS: readonly PlatformModuleId[] = [
  "wallet", "corridors", "quotes", "payments", "batch-payouts",
  "approvals", "reconciliation", "webhooks", "privacy-proofs",
  "disclosure", "partner-settlement",
];
const AUDIENCES = new Set<string>(["consumer", "business", "developer", "partner"]);
const BLOCKED = new Set<PlatformModuleId>([
  "quotes", "payments", "batch-payouts", "privacy-proofs", "partner-settlement",
]);
function record(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
/**
 * Runtime boundary: accept only the known conservative inventory. This never
 * validates release evidence, permissions or privacy proofs. Unknown versions
 * must be reviewed rather than silently enabling frontend actions.
 */
export function validPlatformCatalog(v: unknown): v is PlatformCatalog {
  if (!record(v) || v.product !== "StealthBridge" || v.network !== "testnet" ||
    v.payment_execution_enabled !== false || v.privacy_verified !== false ||
    v.mainnet_enabled !== false || !Array.isArray(v.modules) ||
    v.modules.length !== IDS.length) return false;
  const found = new Set<string>();
  for (const item of v.modules) {
    if (!record(item) || typeof item.id !== "string" ||
      !IDS.includes(item.id as PlatformModuleId) || found.has(item.id) ||
      !Array.isArray(item.audiences) || item.audiences.length === 0 ||
      item.audiences.length > 4 ||
      new Set(item.audiences).size !== item.audiences.length ||
      !item.audiences.every((a: unknown) => typeof a === "string" && AUDIENCES.has(a)) ||
      typeof item.description !== "string" ||
      item.description.trim().length === 0 || item.description.length > 180 ||
      !["metadata-only", "planned", "blocked"].includes(String(item.availability))) return false;
    const id = item.id as PlatformModuleId;
    if (item.availability === "metadata-only" && id !== "corridors") return false;
    if (id === "corridors" && item.availability !== "metadata-only") return false;
    if (BLOCKED.has(id) && item.availability !== "blocked") return false;
    found.add(item.id);
  }
  return IDS.every(id => found.has(id));
}
