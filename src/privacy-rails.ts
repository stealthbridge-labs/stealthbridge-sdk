export type PrivacyArchitectureKind =
  | "local-encrypted-draft"
  | "private-payments"
  | "confidential-token";

export type ProductExperience = "personal" | "business";

export type AssetSemantics =
  | "exact-transfer-sep41"
  | "fee-on-transfer"
  | "rebasing"
  | "unknown";

export type RailBlockReason =
  | "draft-not-on-chain-settlement"
  | "rail-segment-mismatch"
  | "network-passphrase-mismatch"
  | "asset-not-exact-transfer-sep41"
  | "soroban-runtime-mismatch"
  | "ledger-history-pruned-without-indexer"
  | "missing-recovery-seed"
  | "prover-or-vk-unverified"
  | "external-operator-or-issuer-unverified"
  | "execution-disabled";

export interface RailObserverDisclosure {
  publicSenderOrFeePayer: boolean;
  publicRecipientOnEdge: boolean;
  publicRecipientOnInternalTransfer: boolean;
  publicEdgeAmount: boolean;
  publicInternalAmount: boolean;
  publicCounterpartyGraph: boolean;
  auditorOrGlobalViewKeyDisclosure: boolean;
  summary: string;
}

export interface PrivacyRailAdapterSpec {
  rail: PrivacyArchitectureKind;
  evaluatedFor: ProductExperience | "storage-only";
  upstreamRepo: string | null;
  pinnedRef: string | null;
  licenseModel: string;
  requiredSorobanSdk: string | null;
  productionReady: false;
  executionEnabled: false;
  disclosure: RailObserverDisclosure;
  blockers: readonly string[];
}

export interface PrivacyRailReadinessInput {
  experience: ProductExperience;
  rail: PrivacyArchitectureKind;
  networkPassphrase: string;
  assetSemantics: AssetSemantics;
  accountCreatedLedger: number;
  rpcOldestRetainedLedger: number;
  durableIndexerAvailable: boolean;
  recoverySeedBackedUp: boolean;
  externalOperatorOrIssuerVerified: boolean;
}

export interface PrivacyRailAssessment {
  rail: PrivacyArchitectureKind;
  architecturallyEligible: boolean;
  productionReady: false;
  executionEnabled: false;
  blockReasons: RailBlockReason[];
  disclosure: RailObserverDisclosure;
}

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export function describePrivacyRailArchitecture(
  rail: PrivacyArchitectureKind,
): PrivacyRailAdapterSpec {
  if (rail === "local-encrypted-draft") {
    return {
      rail,
      evaluatedFor: "storage-only",
      upstreamRepo: null,
      pinnedRef: null,
      licenseModel: "StealthBridge MIT",
      requiredSorobanSdk: null,
      productionReady: false,
      executionEnabled: false,
      disclosure: {
        publicSenderOrFeePayer: false,
        publicRecipientOnEdge: false,
        publicRecipientOnInternalTransfer: false,
        publicEdgeAmount: false,
        publicInternalAmount: false,
        publicCounterpartyGraph: false,
        auditorOrGlobalViewKeyDisclosure: false,
        summary:
          "Browser/vault ciphertext and SHA-256 commitments protect off-chain draft records only; they never create confidential on-chain settlement.",
      },
      blockers: ["Not a settlement rail; drafts cannot move funds or hide on-chain activity."],
    };
  }
  if (rail === "private-payments") {
    return {
      rail,
      evaluatedFor: "personal",
      upstreamRepo: "https://github.com/NethermindEth/stellar-private-payments",
      pinnedRef: "cebb972b5872cba3a1cc40bcdfab297168ccc1d7",
      licenseModel: "Apache-2.0 workspace; circomlib LGPL-3.0 + circuit-compiler GPL-3.0 artifacts",
      requiredSorobanSdk: "28.x (BN254 pairing host precompile)",
      productionReady: false,
      executionEnabled: false,
      disclosure: {
        publicSenderOrFeePayer: true,
        publicRecipientOnEdge: true,
        publicRecipientOnInternalTransfer: false,
        publicEdgeAmount: true,
        publicInternalAmount: false,
        publicCounterpartyGraph: false,
        auditorOrGlobalViewKeyDisclosure: false,
        summary:
          "Shields in-pool UTXO counterparties and internal amounts via BN254 Groth16, while deposit/withdrawal edges, fees, ASP proofs, and fee-payer remain public.",
      },
      blockers: [
        "Unaudited developer preview; cannot compose directly with soroban-sdk 27.0.6 contracts.",
        "Requires local note state/backup + durable event indexing beyond RPC ~7-day retention.",
        "Bundled circuit artifacts carry LGPL-3.0 / GPL-3.0 licensing obligations.",
      ],
    };
  }
  return {
    rail,
    evaluatedFor: "business",
    upstreamRepo: "https://github.com/OpenZeppelin/stellar-contracts",
    pinnedRef: "v0.8.0 (ddc327eb92d63709436da3a8455f641c2d5476c5)",
    licenseModel: "MIT",
    requiredSorobanSdk: "28.x (UltraHonk Keccak + Poseidon2 host)",
    productionReady: false,
    executionEnabled: false,
    disclosure: {
      publicSenderOrFeePayer: true,
      publicRecipientOnEdge: true,
      publicRecipientOnInternalTransfer: true,
      publicEdgeAmount: true,
      publicInternalAmount: false,
      publicCounterpartyGraph: true,
      auditorOrGlobalViewKeyDisclosure: true,
      summary:
        "Hides internal balances and transfer amounts with Grumpkin Pedersen commitments + UltraHonk, while sender, recipient, counterparty graph, and auditor keys remain visible.",
    },
    blockers: [
      "Unaudited developer preview; cannot compose directly with soroban-sdk 27.0.6 contracts.",
      "Requires exact-transfer SEP-41 assets, durable event checkpoints, and external nargo/bb prover artifacts.",
      "SAC passthrough freeze or direct underlying clawback can stall or undercollateralize the pool.",
    ],
  };
}

/** Evaluates isolated third-party privacy rail prerequisites without ever enabling settlement. */
export function assessPrivacyRailReadiness(
  input: PrivacyRailReadinessInput,
): PrivacyRailAssessment {
  const spec = describePrivacyRailArchitecture(input.rail);
  const reasons: RailBlockReason[] = [];

  if (input.rail === "local-encrypted-draft") {
    reasons.push("draft-not-on-chain-settlement");
  } else if (
    (input.experience === "personal" && input.rail !== "private-payments") ||
    (input.experience === "business" && input.rail !== "confidential-token")
  ) {
    reasons.push("rail-segment-mismatch");
  }
  if (input.networkPassphrase !== TESTNET_PASSPHRASE) {
    reasons.push("network-passphrase-mismatch");
  }
  if (input.assetSemantics !== "exact-transfer-sep41") {
    reasons.push("asset-not-exact-transfer-sep41");
  }
  reasons.push("soroban-runtime-mismatch");
  if (
    input.accountCreatedLedger < input.rpcOldestRetainedLedger &&
    !input.durableIndexerAvailable
  ) {
    reasons.push("ledger-history-pruned-without-indexer");
  }
  if (!input.recoverySeedBackedUp) {
    reasons.push("missing-recovery-seed");
  }
  reasons.push("prover-or-vk-unverified");
  if (!input.externalOperatorOrIssuerVerified) {
    reasons.push("external-operator-or-issuer-unverified");
  }
  reasons.push("execution-disabled");

  const coreEligible =
    input.rail !== "local-encrypted-draft" &&
    !reasons.includes("rail-segment-mismatch") &&
    !reasons.includes("network-passphrase-mismatch") &&
    !reasons.includes("asset-not-exact-transfer-sep41") &&
    !reasons.includes("ledger-history-pruned-without-indexer") &&
    input.recoverySeedBackedUp;

  return {
    rail: input.rail,
    architecturallyEligible: coreEligible,
    productionReady: false,
    executionEnabled: false,
    blockReasons: reasons,
    disclosure: spec.disclosure,
  };
}
