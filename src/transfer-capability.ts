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

/**
 * A read-only, compile-time capability contract, NOT a wallet signer.
 * Confidential Tokens expose sender and recipient but hide amounts; private
 * payments use shared pools and client-owned notes with stronger link privacy.
 */
export interface DeviceOwnedPrivacyState {
  custody: "device-only";
  networkPassphrase: "Test SDF Network ; September 2015";
  /** Key derivation, nullifiers and recovery remain the user's responsibility. */
  recovery: "device-owned-encrypted-backup";
  /** Distinct consent/replay record is scoped to the account + Testnet + rail. */
  antiReplay: "account-network-rail-nonce-bound";
}

export interface ConfidentialTokenAdapterDesign {
  rail: "confidential-token";
  privacyModel: "amount-and-balance-only";
  visibleOnLedger: "sender-and-recipient";
  prover: "ultrahonk";
  wallet: DeviceOwnedPrivacyState;
  readOnly: true;
  transferExecutionEnabled: false;
}

export interface PrivatePaymentsAdapterDesign {
  rail: "private-payments";
  privacyModel: "pool-notes-and-counterparty-shielding";
  visibleOnLedger: "pool-entry-and-exit";
  prover: "groth16";
  notes: "encrypted-user-device-only";
  wallet: DeviceOwnedPrivacyState;
  readOnly: true;
  transferExecutionEnabled: false;
}

export type WalletOwnedAdapterDesign = ConfidentialTokenAdapterDesign | PrivatePaymentsAdapterDesign;

/**
 * Reject every proposal to sign/submit: upstream SDK support and wallet
 * capability must be independently verified first. Caller metadata is not proof.
 */
export function assessWalletOwnedAdapter(
  design: WalletOwnedAdapterDesign,
  evidence: TransferEvidence,
): TransferAssessment {
  if (!design || !evidence || design.rail !== evidence.rail)
    return { supported: false, reason: "UNSUPPORTED_RAIL" };
  if (design.wallet?.networkPassphrase !== "Test SDF Network ; September 2015"
      || design.wallet?.custody !== "device-only"
      || design.wallet?.recovery !== "device-owned-encrypted-backup"
      || design.wallet?.antiReplay !== "account-network-rail-nonce-bound"
      || design.readOnly !== true
      || design.transferExecutionEnabled !== false)
    return { supported: false, reason: "UNSUPPORTED_WALLET" };
  const correct = design.rail === "confidential-token"
    ? design.privacyModel === "amount-and-balance-only"
      && design.prover === "ultrahonk"
      && design.visibleOnLedger === "sender-and-recipient"
    : design.rail === "private-payments"
      && design.privacyModel === "pool-notes-and-counterparty-shielding"
      && design.prover === "groth16"
      && design.notes === "encrypted-user-device-only"
      && design.visibleOnLedger === "pool-entry-and-exit";
  if (!correct) return { supported: false, reason: "UNSUPPORTED_RAIL" };
  return assessTransferCapability(evidence);
}
