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

export { assessBusinessReview, BusinessReviewError } from "./business-review.js";
export type { BusinessReviewRole, BusinessReviewPolicy, BusinessReviewRecord, BusinessReviewResult, BusinessReviewErrorCode } from "./business-review.js";

export { canonicalBusinessEnvelope, digestBusinessEnvelope } from "./business-envelope.js";
export type { ReviewOperation, BusinessEnvelopeInput, BusinessEnvelopeDigest } from "./business-envelope.js";

export { readBusinessReviewStatus, validBusinessReviewStatus } from "./business-reader.js";
export type { BusinessReviewStatus, ReviewReadOptions } from "./business-reader.js";

export { assessRegistryUpgrade } from "./upgrade-review.js";
export type { UpgradeableRegistry, UpgradeWindowState, PublicUpgradeProposal, RegistryUpgradeObservation, RegistryUpgradeAssessment } from "./upgrade-review.js";
// Explicit Testnet fee *quotes* only; charging/transfers remain disabled.
export { quotePlatformFee, PlatformFeeError, DEFAULT_PLATFORM_FEE_BPS, MAX_PLATFORM_FEE_BPS } from "./platform-fees.js";
export type { PlatformFeePolicy, PlatformFeeQuote } from "./platform-fees.js";

export { validGovernanceRelease } from "./governance-release.js";
export type { GovernanceRelease, GovernanceContractReceipt } from "./governance-release.js";

export { validGovernanceCode } from "./governance-code.js";
export type { GovernanceCodeObservation, GovernanceExecutable } from "./governance-code.js";

export {validGovernanceAdministrator} from "./governance-administrator.js";
export type {GovernanceAdministratorRecord,GovernanceAdministratorObservation} from "./governance-administrator.js";

export { assessGovernanceObservations } from "./governance-assessment.js";
export type { GovernanceAssessment } from "./governance-assessment.js";

export {validContractObservation,activePublicContractAtAddress} from "./contract-observation.js";
export type {ContractObservation} from "./contract-observation.js";

export {isContractStrKey,isActivityCursor,assertActivityFilters,validateActivityPage} from "./observer-activity.js";
export type {ActivityContract,ActivityEvent,PublicActivityPage,ActivityFilters} from "./observer-activity.js";

export {validGovernanceSnapshot} from "./governance-snapshot.js";
export type {GovernanceSnapshot} from "./governance-snapshot.js";

export {validObserverSchema} from "./observer-schema.js";
export type {ObserverSchema} from "./observer-schema.js";

export {classifyPublicStellarAddress,preparePrivateTransfer} from "./private-transfer.js";
export type {PublicAddressIdentity,PrivacyRail as PreparedPrivacyRoute,PaymentPreparation} from "./private-transfer.js";

export {validAccountDirectory,readAccountDirectory} from "./account-directory.js";
export type {AccountDirectory,AccountOrganization,AccountMemberRole} from "./account-directory.js";

export {validProfilePreferences,validAccountProfileEnvelope,readCustomerProfile,saveCustomerPreferences} from "./account-profile.js";
export type {ProfileUseCase,ProfilePreferences,CustomerProfile,AccountProfileEnvelope} from "./account-profile.js";

export {validBusinessApplicationName,validBusinessOnboarding,listBusinessApplications,createBusinessApplication,amendBusinessApplication,withdrawBusinessApplication} from "./business-onboarding.js";
export type {BusinessOnboardingEnvelope,PendingBusinessApplication} from "./business-onboarding.js";

export {validOrganizationTeamSnapshot,readOrganizationTeam} from "./organization-team.js";
export type {OrganizationTeamRole,OrganizationTeamMember,OrganizationTeamAccount,OrganizationTeamSnapshot} from "./organization-team.js";

export {validTeamInvitationDirectory,validTeamInviteAction,loadTeamInvitations,submitTeamInviteAction} from "./team-invites.js";
export type {TeamInviteRecord,TeamInvitationDirectory,TeamInviteAction} from "./team-invites.js";

export {validDependencyDiagnostics} from "./dependency-diagnostics.js";
export type {DependencyDiagnostics} from "./dependency-diagnostics.js";
