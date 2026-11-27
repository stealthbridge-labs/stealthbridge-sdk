export const SDK_VERSION = "0.3.0";
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
export { allowedSettlementTransitions, SettlementTransitionError, isSettlementState, canTransitionSettlement, assertSettlementTransition, isTerminalSettlementState, awaitsExternalDeliveryEvidence } from "./settlement.js";
export { canonicalStellarAccountAddress, canonicalMuxedAccountAddress, canonicalMuxedContractAddress, parseStellarAddress } from "./wallet.js";
export type { StellarAddressKind, ParsedStellarAddress } from "./wallet.js";

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

export {validCorridorPreflight} from "./corridor-preflight.js";
export type {CorridorPreflight} from "./corridor-preflight.js";

export {parseBusinessBatchCsv,assertBusinessRouteIds,validCorridorBatch,assessBusinessBatch} from "./business-batch.js";
export type {BusinessBatchRow,BusinessBatchDraft,BusinessBatchAssessment,CorridorBatch} from "./business-batch.js";

export {validCorridorBatchPreflight,matchingCorridorBatches} from "./business-batch-preflight.js";
export type {CorridorBatchPreflight} from "./business-batch-preflight.js";

export {validRecipientPresence,currentRecipientContract} from "./recipient-presence.js";
export type {RecipientPresence} from "./recipient-presence.js";

export {validClassicRecipientPresence,currentClassicRecipient} from "./classic-recipient-presence.js";
export type {ClassicRecipientPresence} from "./classic-recipient-presence.js";

export {canonicalPrivateReviewDraft,digestPrivateReviewDraft,createPrivateReviewReceipt,verifyPrivateReviewReceipt} from "./private-review-commitment.js";
export type {PrivateReviewDraft,PrivateReviewReceipt} from "./private-review-commitment.js";

export {encryptCustomerDraft,decryptCustomerDraft,reencryptCustomerDraft,validCustomerDraft,validEncryptedCustomerDraft,validEncryptedDraftDirectory,PRIVATE_DRAFT_LIMIT} from "./private-draft-vault.js";
export type {CustomerDraft,EncryptedCustomerDraft,CustomerEncryptedDraftDirectory,CustomerEncryptedDraftRecord} from "./private-draft-vault.js";
export {validSmartAccountKitSnapshot} from "./smart-account-kit.js";
export type {SmartAccountKitSnapshot,SmartAccountKitEntry,SmartAccountKitEntryName} from "./smart-account-kit.js";
export type {ApiSmartAccountKitObservation,ApiSmartAccountKitEntry} from "./generated/api-wire.js";

export {parseSettlementNotification,type SettlementNotification} from "./settlement-notification.js";
export {fingerprintInstructionRoute,validPaymentInstructionInput,validPaymentInstructionDirectory,listPaymentInstructions,savePaymentInstruction,cancelPaymentInstruction,PaymentInstructionError,type PaymentInstruction,type PaymentInstructionInput,type PaymentInstructionDirectory,type InstructionState} from "./payment-instructions.js";
export {describePrivacyRailArchitecture,assessPrivacyRailReadiness} from "./privacy-rails.js";
export type {PrivacyArchitectureKind,ProductExperience,AssetSemantics,RailObserverDisclosure,PrivacyRailAdapterSpec,PrivacyRailReadinessInput,PrivacyRailAssessment,RailBlockReason} from "./privacy-rails.js";
export {allowedSettlementLifecycleTransitions,canTransitionSettlementLifecycle,canonicalSettlementIntentDigest,canonicalCustomerAuthorizationDigest,validSettlementLifecycleDirectory,listSettlementLifecycles,createSettlementLifecycle,advanceSettlementLifecycle,SettlementLifecycleError} from "./settlement-lifecycle.js";
export type {LifecycleState,CreateSettlementLifecycleInput,SettlementLifecycleEvent,SettlementLifecycleRecord,SettlementLifecycleDirectory,SettlementLifecycleAction} from "./settlement-lifecycle.js";
export {validBeneficiaryLabel,validUpsertBeneficiaryInput,validBeneficiaryRecord,validBeneficiaryDirectory,listAccountBeneficiaries,saveAccountBeneficiary,removeAccountBeneficiary} from "./account-beneficiaries.js";
export type {BeneficiaryFlow,BeneficiaryRecipientKind,UpsertBeneficiaryInput,AccountBeneficiary,BeneficiaryDirectory} from "./account-beneficiaries.js";
export {validDeployRequest,validDeploymentDirectory,validLabel as validSmartAccountLabel,p256PointFromSpki,base64url} from "./smart-accounts.js";
export type {DeployRequest as SmartAccountDeployRequest,DeploymentDirectory as SmartAccountDeploymentDirectory,SmartAccountDeployment,DeploymentStatus as SmartAccountDeploymentStatus} from "./smart-accounts.js";
export {TESTNET_CONTRACTS,TESTNET_NETWORK_PASSPHRASE} from "./testnet.js";
export {validPreparedPayment,validPaymentDirectory,verifyPreparedPayment,sacContractId,strkeyPayload,base64urlBytes} from "./smart-account-payments.js";
export type {PreparedPayment,PaymentRecord,PaymentDirectory,PaymentAssertion,PaymentStatus,ExpectedPayment} from "./smart-account-payments.js";
export {OZ_SMART_ACCOUNTS_TESTNET,passkeyKeyData,passkeyDeploySalt,walletAddressFromSalt,predictPasskeyWallet,validRelaySubmission,validRelayResponse} from "./oz-smart-accounts.js";
export type {RelaySubmission,RelayResponse} from "./oz-smart-accounts.js";
export {encodeContractAddress} from "./wallet.js";

export {PERSONAL_SHIELDED_POOL,BUSINESS_CONFIDENTIAL_TOKEN,assertRailEnabled,PrivacyRailUnavailableError,personalPool,disclosureFor} from "./privacy-rails-v2.js";
export type {PrivacyRailId,Visibility,DisclosureModel,PersonalPool,PersonalOperationState} from "./privacy-rails-v2.js";
