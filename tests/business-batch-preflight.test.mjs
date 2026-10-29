import {test} from "node:test";
import assert from "node:assert/strict";
import {matchingCorridorBatches,validCorridorBatchPreflight,StealthBridgeClient} from "../dist/index.js";
const id="11111111-2222-4333-8444-555555555555";
const row={id,origin_country:"NG",destination_country:"GH",asset_code:"USDC",
 asset_issuer:null,privacy_rail:"private-payments"};
const batch={schema_version:1,network:"testnet",source:"operator-corridor-batch",
 requested_ids:[id],items:[row],missing_ids:[],all_configured:true,
 payment_execution_enabled:false,privacy_verified:false,fiat_payouts_enabled:false};
const now=1800000000;
const preflight={schema_version:1,network:"testnet",
 source:"live-batch-metadata-preflight",observed_at_unix:now,batch,
 network_fresh:true,ledger_sequence:12345,database_schema_ready:false,
 read_only_dependencies_ready:false,payment_execution_enabled:false,
 fee_quote_available:false,liquidity_verified:false,issuer_verified:false,
 privacy_verified:false,fiat_payouts_enabled:false};
test("preflight rejects stale, forged and inconsistent evidence",()=>{
 assert.equal(validCorridorBatchPreflight(preflight,[id],now),true);
 for(const bad of [
  {...preflight,observed_at_unix:now-121},
  {...preflight,network:"mainnet"},
  {...preflight,read_only_dependencies_ready:true},
  {...preflight,privacy_verified:true},
  {...preflight,fee_quote_available:true},
  {...preflight,ledger_sequence:0},
  {...preflight,batch:{...batch,items:[{...row,asset_code:"fake!"}]}},
  {...preflight,extra:true},
  {...preflight,network_fresh:false}
 ])assert.equal(validCorridorBatchPreflight(bad,[id],now),false);
 assert.equal(validCorridorBatchPreflight({...preflight,network_fresh:false,ledger_sequence:null},[id],now),true);
});
test("separate verified live snapshots must agree on the full corridor record",()=>{
 assert.equal(matchingCorridorBatches(batch,structuredClone(batch)),true);
 assert.equal(matchingCorridorBatches(batch,{
  ...batch,items:[{...row,asset_code:"EURC"}]}),false);
 assert.equal(matchingCorridorBatches(batch,{
  ...batch,items:[],missing_ids:[id],all_configured:false}),false);
});
test("SDK live preflight sends only public route UUIDs",async()=>{
 let request="";
 const client=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",
  fetchImpl:async url=>{request=String(url);return new Response(JSON.stringify({
   ...preflight,observed_at_unix:Math.floor(Date.now()/1000)}),
   {headers:{"content-type":"application/json"}})}});
 const result=await client.corridorBatchPreflight([id]);
 assert.equal(result.database_schema_ready,false);
 assert.equal(request,"/api/bridge/v1/corridors/batch/preflight?ids="+id);
});
