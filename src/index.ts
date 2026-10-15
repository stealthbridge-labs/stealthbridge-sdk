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
  FreshNetworkOptions,
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
export { canonicalStellarAccountAddress } from "./wallet.js";

export type { ApiNetworkStatus, ApiCapabilities, ApiCorridor, ApiCorridorPage, ApiReadiness, ApiContractDiscovery, ApiErrorEnvelope } from "./generated/api-wire.js";

export type { TransferRail, TransferEvidence, TransferAssessment,
  DeviceOwnedPrivacyState, ConfidentialTokenAdapterDesign,
  PrivatePaymentsAdapterDesign, WalletOwnedAdapterDesign
} from "./transfer-capability.js";

export {readIntegrationSnapshot} from "./integration-snapshot.js";
export type {IntegrationSnapshot,Observation} from "./integration-snapshot.js";

export {assessPublicObservations,appendPublicEvidence,publicEvidenceReceipt} from "./observation-health.js";
export type {PublicObservationInput,PublicNetworkEvidence,PersistedObserverEvidence,PublicReadinessEvidence,PublicCapabilityEvidence,PublicContractEvidence,PublicEvidenceAssessment,PublicEvidenceRecord,ObserverComparison,EvidenceVerdict} from "./observation-health.js";

export { assertModuleAvailable, listAvailableModules, ProductCapabilityError } from "./product-capabilities.js";
export type { ProductAudience, ProductModule, ReleaseStage, PrivacyMode, ModuleAvailability } from "./product-capabilities.js";

export { validPlatformCatalog } from "./platform.js";
export type { PlatformCatalog, PlatformModule, PlatformModuleId, PlatformAudience, PlatformAvailability } from "./platform.js";

export { assessDeveloperReadiness } from "./developer-readiness.js";
export type { DeveloperCheckId, DeveloperCheckState, DeveloperCheck, DeveloperReadiness, DeveloperObservation } from "./developer-readiness.js";
