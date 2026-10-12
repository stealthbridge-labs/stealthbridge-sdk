/** Pure, fail-closed capability assessment. No signing or payment methods. */
export type TransferRail = "confidential-token" | "private-payments";
export interface TransferEvidence {
  network: "testnet";
  rail: TransferRail;
  independentlyVerified: boolean;
  proofAvailable: boolean;
  walletSupported: boolean;
}
export type TransferAssessment =
  | { supported: false; reason: "WRONG_NETWORK" | "UNSUPPORTED_RAIL" | "UNVERIFIED_RAIL" | "MISSING_PROOF" | "UNSUPPORTED_WALLET" }
  | { supported: false; reason: "EXECUTION_DISABLED" };
/** Even complete evidence cannot enable financial execution in this SDK. */
export function assessTransferCapability(evidence: TransferEvidence): TransferAssessment {
  // JavaScript consumers can bypass TypeScript's literal network and rail types.
  if (!evidence || evidence.network !== "testnet") return { supported: false, reason: "WRONG_NETWORK" };
  if (evidence.rail !== "confidential-token" && evidence.rail !== "private-payments")
    return { supported: false, reason: "UNSUPPORTED_RAIL" };
  if (!evidence.independentlyVerified) return { supported: false, reason: "UNVERIFIED_RAIL" };
  if (!evidence.proofAvailable) return { supported: false, reason: "MISSING_PROOF" };
  if (!evidence.walletSupported) return { supported: false, reason: "UNSUPPORTED_WALLET" };
  return { supported: false, reason: "EXECUTION_DISABLED" };
}
