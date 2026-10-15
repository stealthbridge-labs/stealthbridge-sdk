import {test} from "node:test";
import assert from "node:assert/strict";
import {StealthBridgeClient,readIntegrationSnapshot} from "../dist/index.js";

const now=()=>Math.floor(Date.now()/1000);
const passphrase="Test SDF Network ; September 2015";
const validNetwork=()=>({
 network:"testnet",passphrase,protocol_version:23,
 ledger_sequence:23456,ledger_hash:"a".repeat(64),
 ledger_closed_at_unix:String(now()-8),source:"stellar-rpc",
});
const validHead=()=>({ledger_sequence:23454,ledger_hash:"b".repeat(64),
 ledger_closed_at_unix:String(now()-24),source:"stellar-rpc"});
const safeCapabilities=()=>({
 payments_enabled:false,confidential_token_verified:false,
 private_payments_verified:false,fiat_payouts_enabled:false
});
const degradedReady={
 status:"degraded",stellar_rpc:"unavailable",database:"not-configured",payments:"disabled"
};
const connectedReady={
 status:"ready",stellar_rpc:"connected",database:"connected",payments:"disabled"
};
function client(get){
 return new StealthBridgeClient({
  network:"testnet",apiBaseUrl:"https://example.test",
  fetchImpl:async(input,options)=>{
   assert.equal(options.method,"GET");
   return get(new URL(input).pathname,options);
  },
 });
}
const answer=(data,status=200)=>new Response(status===200?JSON.stringify(data):"",
 {status,headers:{"content-type":"application/json"}});

test("aggregates independent actual reads without making up observer or contract evidence",async()=>{
 const called=[];
 const api=client(path=>{
  called.push(path);
  if(path==="/v1/network")return answer(validNetwork());
  if(path==="/v1/observer")return answer(null,404);
  if(path==="/ready")return answer(degradedReady);
  if(path==="/v1/capabilities")return answer(safeCapabilities());
  if(path==="/v1/contracts")return answer(null,503);
  throw new Error("unexpected endpoint "+path);
 });
 const snapshot=await readIntegrationSnapshot(api);
 assert.equal(snapshot.network,"testnet");
 assert.equal(snapshot.ledger_freshness,"fresh");
 assert.equal(snapshot.network_status.state,"available");
 assert.equal(snapshot.observer_checkpoint.state,"unavailable");
 assert.equal(snapshot.observer_checkpoint.reason,"not-found");
 assert.equal(snapshot.readiness.data.status,"degraded");
 assert.equal(snapshot.capabilities.data.payments_enabled,false);
 assert.equal(snapshot.contracts.reason,"dependency-unavailable");
 assert.equal(snapshot.payment_execution_enabled,false);
 assert.deepEqual(called.sort(),[
  "/ready","/v1/capabilities","/v1/contracts","/v1/network","/v1/observer"
 ].sort());
});

test("missing RPC and database cannot become healthy from an existing checkpoint",async()=>{
 const api=client(path=>{
  if(path==="/v1/observer")return answer(validHead());
  if(path==="/v1/network")return answer(null,502);
  if(path==="/ready")return answer(null,503);
  if(path==="/v1/capabilities")return answer(safeCapabilities());
  if(path==="/v1/contracts")return answer(null,404);
 });
 const snapshot=await readIntegrationSnapshot(api);
 assert.equal(snapshot.ledger_freshness,"unavailable");
 assert.equal(snapshot.observer_checkpoint.state,"available");
 assert.equal(snapshot.network_status.state,"unavailable");
 assert.equal(snapshot.readiness.status,503);
 assert.equal(snapshot.payment_execution_enabled,false);
});

test("freshness is based on the live network only, never persisted observer head",async()=>{
 const api=client(path=>{
  if(path==="/v1/network")return answer({...validNetwork(),ledger_closed_at_unix:String(now()-900)});
  if(path==="/v1/observer")return answer(validHead());
  if(path==="/ready")return answer(connectedReady);
  if(path==="/v1/capabilities")return answer(safeCapabilities());
  return answer(null,404);
 });
 const snapshot=await readIntegrationSnapshot(api,{maxAgeSeconds:180});
 assert.equal(snapshot.ledger_freshness,"stale");
 assert.equal(snapshot.observer_checkpoint.state,"available");
 assert.equal(snapshot.payment_execution_enabled,false);
 await assert.rejects(readIntegrationSnapshot(api,{maxAgeSeconds:0}),RangeError);
 await assert.rejects(readIntegrationSnapshot(api,{maxAgeSeconds:3601}),RangeError);
});

test("rejected positive payment flags become an unavailable observation",async()=>{
 const api=client(path=>{
  if(path==="/v1/capabilities")return answer({...safeCapabilities(),payments_enabled:true});
  return answer(null,503);
 });
 const snapshot=await readIntegrationSnapshot(api);
 assert.equal(snapshot.capabilities.state,"unavailable");
 assert.equal(snapshot.payment_execution_enabled,false);
});

test("cancellation prevents publishing a partial snapshot",async()=>{
 const controller=new AbortController();
 controller.abort(new Error("navigation cancelled"));
 const api=client(()=>{throw new Error("must not send requests");});
 await assert.rejects(readIntegrationSnapshot(api,{signal:controller.signal}),/navigation cancelled/);
});
