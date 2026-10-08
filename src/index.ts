export const SDK_VERSION = "0.2.0";
export {
  StealthBridgeClient,
  ApiError,
  createBrowserBridgeClient,
  createSameOriginBridgeClient,
  createBridgeClient,
} from "./client.js";
export type {
  ClientConfig,
  BrowserBridgeOptions,
  RequestOptions,
  CorridorPageOptions,
  CorridorScanOptions,
} from "./client.js";
export type {
  Readiness, ContractDiscovery, PublicSorobanInterface, CorridorPage, LedgerCheckpoint, Network, PrivacyRail, SettlementState, Capabilities, NetworkStatus, Corridor, SettlementSummary, TransactionObservation,
} from "./types.js";
export { AssetAmount, AmountError, assertAsset } from "./amount.js";
export type { AssetIdentity } from "./amount.js";
export { ManifestError, parseDeploymentManifest, getVerifiedContract } from "./manifest.js";
export type { DeploymentManifest,ManifestCompatibility } from "./manifest.js";
export { allowedSettlementTransitions, SettlementTransitionError, isSettlementState, canTransitionSettlement, assertSettlementTransition, isTerminalSettlementState } from "./settlement.js";
