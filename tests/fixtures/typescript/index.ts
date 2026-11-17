import {
  ApiError,
  StealthBridgeClient,
  createBrowserBridgeClient,
  createSameOriginBridgeClient,
  type BrowserBridgeOptions,
  SDK_VERSION,
  type Capabilities,
  type ClientConfig,
  type Corridor,
  type Network,
  type NetworkStatus,
  type PrivacyRail,
  type SettlementState,
  type SettlementSummary,
  type TransactionObservation
} from "@stealthbridge/sdk";

const network: Network = "testnet";
const rail: PrivacyRail = "confidential-token";
const state: SettlementState = "draft";
const config: ClientConfig = { apiBaseUrl: "https://api.example", network };
const client = new StealthBridgeClient(config);
const capabilities: Promise<Capabilities> = client.capabilities();
const corridors: Promise<Corridor[]> = client.corridors();
const status: Promise<NetworkStatus> = client.network();
const observation: Promise<TransactionObservation> = client.transaction("ab".repeat(32));
const settlement = { id: "one", corridor_id: "two", state, privacy_rail: rail } satisfies SettlementSummary;
const error: Error = new ApiError(503, "/v1/corridors");

const browserOptions: BrowserBridgeOptions = { basePath: "/api/bridge", timeoutMs: 5000, maxRetries: 1 };
const browserClient: StealthBridgeClient = createBrowserBridgeClient(browserOptions);
const sameOriginClient: StealthBridgeClient = createSameOriginBridgeClient();
const version: string = SDK_VERSION;

void [capabilities, corridors, status, observation, settlement, error, browserClient, sameOriginClient, version];

// The declaration must preserve the package's testnet-only constraint.
// @ts-expect-error "public" is intentionally not part of Network.
const unsupportedNetwork: Network = "public";
void unsupportedNetwork;

import {validSmartAccountKitSnapshot, type SmartAccountKitSnapshot, type SmartAccountKitEntry,
 type ApiSmartAccountKitObservation} from "@stealthbridge/sdk";
const kit:Promise<SmartAccountKitSnapshot>=client.smartAccountKit({retries:1});
function inspectKit(input:unknown):ApiSmartAccountKitObservation|null {
 if(!validSmartAccountKitSnapshot(input))return null;
 for(const row of input.entries){
  const entry:SmartAccountKitEntry=row;
  if(entry.status==="unavailable"){
   const ttl:null=entry.ttl_remaining_ledgers;
   void ttl;
  }
  if(entry.name==="account_code"){
   const kind:"code"=entry.kind;
   void kind;
  }
 }
 const disabled:false=input.financial_execution_enabled;
 void disabled;
 return input;
}
void [kit,inspectKit];
// @ts-expect-error No customer account deployment API exists.
client.deploySmartAccount();
// @ts-expect-error Artifact observations cannot enable financial execution.
const enabled:true=({} as SmartAccountKitSnapshot).financial_execution_enabled;
void enabled;
