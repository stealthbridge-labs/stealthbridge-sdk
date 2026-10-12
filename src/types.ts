import type {
  ApiCapabilities, ApiNetworkStatus, ApiCorridor, ApiCorridorPage,
  ApiLedgerCheckpoint, ApiReadiness, ApiTransactionObservation
} from "./generated/api-wire.js";

/** Public ledger and corridor models; not a home for payment witnesses or personal data. */
export type Network = "testnet";
export type PrivacyRail = ApiCorridor["privacy_rail"];
export type SettlementState =
  | "draft" | "quoted" | "authorized" | "submitted"
  | "chain_finalized" | "payout_pending" | "payout_completed"
  | "expired" | "rejected" | "chain_failed" | "payout_failed"
  | "refund_pending" | "refunded" | "manual_review";

export interface Capabilities extends ApiCapabilities {}
export interface NetworkStatus extends ApiNetworkStatus {}
export interface Corridor extends ApiCorridor {
  /** The API always supplies a nullable issuer; unknown identity is not an eligible asset. */
  asset_issuer: string | null;
}
export interface SettlementSummary {
  id: string;
  corridor_id: string;
  state: SettlementState;
  privacy_rail: PrivacyRail;
  chain_transaction_hash?: string;
  payout_reference?: string;
}

/** Public transaction inclusion status only. Never includes ledger XDR or private transfer details. */
export interface TransactionObservation extends ApiTransactionObservation {}

/** Bounded, read-only operator configuration page. Never implies live liquidity. */
export interface CorridorPage extends ApiCorridorPage { items: Corridor[]; }

/** Last persisted Testnet observer checkpoint. May be stale, never a payout receipt. */
export interface LedgerCheckpoint extends ApiLedgerCheckpoint {}

/** Service dependencies only; not a payment/issuer approval. */
export interface Readiness extends ApiReadiness {}

/** Deployed contract discovery is intentionally denied until independent RPC verification. */
export interface ContractDiscovery {
 network:"testnet";
 source:"stealthbridge-contracts/deployments/testnet/manifest.json";
 manifest:import("./manifest.js").DeploymentManifest;
 public_interface:PublicSorobanInterface;
 on_chain_verified:false;
 payment_execution_enabled:false;
}

/** Source-level Soroban reads; not a wallet/signed transaction adapter. */
export interface PublicSorobanInterface {
 schemaVersion:1;
 network:"testnet";
 status:"source-interface-only";
 disclaimer:string;
 contracts:Record<string,{
  source:string;
  reads:Record<string,{args:string[];returns:string}>;
  writes:string[];
 }>;
}
