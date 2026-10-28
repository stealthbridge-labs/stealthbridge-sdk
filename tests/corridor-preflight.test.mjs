import {test} from "node:test";
import assert from "node:assert/strict";
import {validCorridorPreflight,StealthBridgeClient} from "../dist/index.js";
const id="11111111-2222-4333-8444-555555555555";
const now=1800000000;
const corridor={id,origin_country:"NG",destination_country:"GB",asset_code:"USDC",
 asset_issuer:null,privacy_rail:"private-payments"};
const safe={schema_version:1,network:"testnet",source:"live-corridor-metadata-preflight",
 observed_at_unix:now,corridor,network_fresh:true,ledger_sequence:123,
 database_schema_ready:true,read_only_dependencies_ready:true,
 payment_execution_enabled:false,fee_quote_available:false,liquidity_verified:false,
 issuer_verified:false,privacy_verified:false,fiat_payouts_enabled:false};
test("preflight rejects forged readiness, stale observations and substitute routes",()=>{
 assert.equal(validCorridorPreflight(safe,id,now),true);
 for(const unsafe of [{...safe,payment_execution_enabled:true},
  {...safe,fee_quote_available:true},{...safe,issuer_verified:true},
  {...safe,privacy_verified:true},{...safe,liquidity_verified:true},
  {...safe,fiat_payouts_enabled:true},{...safe,source:"operator"},
  {...safe,network:"mainnet"},{...safe,observed_at_unix:now-121},
  {...safe,read_only_dependencies_ready:false},{...safe,network_fresh:false},
  {...safe,corridor:{...corridor,id:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"}},
  {...safe,ledger_sequence:0},{...safe,unexpected:"signed"}])
  assert.equal(validCorridorPreflight(unsafe,id,now),false);
 assert.equal(validCorridorPreflight({...safe,network_fresh:false,ledger_sequence:null,
  read_only_dependencies_ready:false},id,now),true);
 assert.equal(validCorridorPreflight({...safe,database_schema_ready:false,
  read_only_dependencies_ready:false},id,now),true);
});
test("SDK makes one GET for public route ID only, never sends private payment data",async()=>{
 let url="";
 const client=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",
  fetchImpl:async target=>{url=String(target);return new Response(JSON.stringify({
   ...safe,observed_at_unix:Math.floor(Date.now()/1000)}),
   {headers:{"content-type":"application/json"}})}});
 assert.equal((await client.corridorPreflight(id)).corridor.id,id);
 assert.equal(url,"/api/bridge/v1/corridors/"+id+"/preflight");
 assert.throws(()=>client.corridorPreflight("../metrics"),TypeError);
});
