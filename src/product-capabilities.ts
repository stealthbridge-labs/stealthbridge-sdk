/** Product capabilities are explicit release gates, not inferred from UI or RPC availability. */
export type ProductAudience = "consumer" | "business" | "developer" | "partner";
export type ProductModule =
  | "wallet" | "corridors" | "quotes" | "payments" | "batch-payouts"
  | "approvals" | "reconciliation" | "webhooks" | "privacy-proofs"
  | "disclosure" | "partner-settlement";
export type ReleaseStage = "unavailable" | "design" | "testnet" | "mainnet";
export type PrivacyMode = "public" | "amount-confidential" | "counterparty-private";

export interface ModuleAvailability {
  module: ProductModule;
  stage: ReleaseStage;
  audiences: readonly ProductAudience[];
  privacy: PrivacyMode;
  /** Source of release evidence: independently verified deployment / test run reference. */
  evidence?: string;
}

export class ProductCapabilityError extends Error {
  constructor(public readonly module: ProductModule, message: string) {
    super(message);
    this.name = "ProductCapabilityError";
  }
}

const rank: Record<ReleaseStage, number> = {
  unavailable: 0, design: 1, testnet: 2, mainnet: 3,
};

/** A missing module, missing evidence or unknown audience fails closed. */
export function assertModuleAvailable(
  manifest: readonly ModuleAvailability[],
  module: ProductModule,
  audience: ProductAudience,
  target: "testnet" | "mainnet",
): ModuleAvailability {
  const entries = manifest.filter(entry => entry.module === module);
  if (entries.length !== 1) {
    throw new ProductCapabilityError(module, "Expected exactly one module capability");
  }
  const entry = entries[0]!;
  if (!entry.audiences.includes(audience)) {
    throw new ProductCapabilityError(module, "Audience is not authorized for this module");
  }
  if (rank[entry.stage] < rank[target] || !entry.evidence?.trim()) {
    throw new ProductCapabilityError(module, "Module has no verified release evidence for this network");
  }
  return entry;
}

export function listAvailableModules(
  manifest: readonly ModuleAvailability[],
  audience: ProductAudience,
  target: "testnet" | "mainnet",
): ProductModule[] {
  const result: ProductModule[] = [];
  for (const entry of manifest) {
    try {
      assertModuleAvailable(manifest, entry.module, audience, target);
      result.push(entry.module);
    } catch (error) {
      if (!(error instanceof ProductCapabilityError)) throw error;
    }
  }
  return result;
}
