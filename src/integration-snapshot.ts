import type {StealthBridgeClient,RequestOptions} from "./client.js";
import {ApiError} from "./client.js";
import type {Capabilities,ContractDiscovery,LedgerCheckpoint,NetworkStatus,Readiness} from "./types.js";

/** All sources originate from real read-only API GET requests; never fixtures. */
export type Observation<T>=
 | {state:"available";data:T}
 | {state:"unavailable";reason:"not-found"|"dependency-unavailable"|"request-failed";status?:number};

export interface IntegrationSnapshot {
 network:"testnet";
 checked_at_unix:number;
 ledger_freshness:"fresh"|"stale"|"unavailable";
 network_status:Observation<NetworkStatus>;
 observer_checkpoint:Observation<LedgerCheckpoint>;
 readiness:Observation<Readiness>;
 capabilities:Observation<Capabilities>;
 contracts:Observation<ContractDiscovery>;
 /** Source-only API observations cannot grant payment execution. */
 payment_execution_enabled:false;
}

/** Never return arbitrary response bodies, credentials, errors or trace data. */
function result<T>(settled:PromiseSettledResult<T>):Observation<T>{
 if(settled.status==="fulfilled")return {state:"available",data:settled.value};
 const error=settled.reason;
 if(error instanceof ApiError){
  return {state:"unavailable",reason:error.status===404?"not-found":
   error.status===503||error.status===502?"dependency-unavailable":"request-failed",
   status:error.status};
 }
 return {state:"unavailable",reason:"request-failed"};
}
function ledgerFresh(value:Observation<NetworkStatus>,now:number,maxAge:number):"fresh"|"stale"|"unavailable"{
 if(value.state!=="available")return "unavailable";
 const observed=Number(value.data.ledger_closed_at_unix);
 if(!Number.isSafeInteger(observed)||observed<=0)return "stale";
 const age=now-observed;
 return age>=-30&&age<=maxAge?"fresh":"stale";
}

/**
 * Aggregate five independently guarded, read-only API calls. Degraded and
 * absent dependencies never become fabricated happy-path records.
 *
 * Does not invoke a wallet, sign, submit payments, assume confidentiality,
 * or substitute a persisted observer checkpoint for a *live* Stellar ledger.
 */
export async function readIntegrationSnapshot(
 client:StealthBridgeClient,
 options:RequestOptions & {maxAgeSeconds?:number}={},
):Promise<IntegrationSnapshot>{
 const maxAge=options.maxAgeSeconds??180;
 if(!Number.isSafeInteger(maxAge)||maxAge<1||maxAge>3600)
  throw new RangeError("maxAgeSeconds must be a whole number between 1 and 3600");
 options.signal?.throwIfAborted();
 const calls=await Promise.allSettled([
  client.network(options),
  client.observerHead(options),
  client.readiness(options),
  client.capabilities(options),
  client.contracts(options),
 ] as const);
 options.signal?.throwIfAborted();
 const now=Math.floor(Date.now()/1000);
 const network=result(calls[0]);
 return {
  network:"testnet",
  checked_at_unix:now,
  ledger_freshness:ledgerFresh(network,now,maxAge),
  network_status:network,
  observer_checkpoint:result(calls[1]),
  readiness:result(calls[2]),
  capabilities:result(calls[3]),
  contracts:result(calls[4]),
  payment_execution_enabled:false,
 };
}
