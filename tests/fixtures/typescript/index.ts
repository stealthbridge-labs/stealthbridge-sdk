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
