import {test} from "node:test";
import assert from "node:assert/strict";
import {parseBusinessBatchCsv,assertBusinessRouteIds,validCorridorBatch,
 assessBusinessBatch,StealthBridgeClient} from "../dist/index.js";
const id="11111111-2222-4333-8444-555555555555",id2="99999999-aaaa-4aaa-8aaa-bbbbbbbbbbbb";
const recipient="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";
const header="corridor_id,recipient,amount,reference";
const csv=header+"\n"+id+","+recipient+",12.3456700,INV-100\n"+id2+","+recipient+",3.5,INV-101";
const corridor={id,origin_country:"NG",destination_country:"GH",asset_code:"USDC",
 asset_issuer:null,privacy_rail:"private-payments"};
const batch={schema_version:1,network:"testnet",source:"operator-corridor-batch",
 requested_ids:[id,id2],items:[corridor],missing_ids:[id2],all_configured:false,
 payment_execution_enabled:false,privacy_verified:false,fiat_payouts_enabled:false};
test("local CSV batch strictly validates rows, references, identities and bounds",()=>{
 const result=parseBusinessBatchCsv(csv);
 assert.equal(result.rows.length,2);
 assert.deepEqual(result.routeIds,[id,id2]);
 assert.equal(result.rows[0].amount,"12.3456700");
 const issues=[csv.replace("INV-101","INV-100"),
 csv.replace("INV-101","=HYPERLINK()"),csv.replace("12.3456700","1e9"),
 csv.replace(recipient,"GNOTANADDRESS"),csv.replace(id2,"../metrics"),
 csv+"\n"+id+","+recipient+",2,INV-102".repeat(50),
 header+"\n"+[id,recipient,"1","INV-100","fifth"].join(",")];
 for(const bad of issues)assert.throws(()=>parseBusinessBatchCsv(bad),TypeError);
 const quoted=header+"\n"+[id,recipient,"1",'"INV-100"'].join(",");
 assert.equal(parseBusinessBatchCsv(quoted).rows[0].reference,"INV-100");
 assert.throws(()=>parseBusinessBatchCsv(header+"\n"+id+","+recipient+",1,\"unfinished"),TypeError);
});
test("strict public corridor batch partitions only actual metadata, never authorizes transfers",()=>{
 assert.equal(validCorridorBatch(batch,[id,id2]),true);
 assert.deepEqual(assessBusinessBatch(parseBusinessBatchCsv(csv),batch),{
  totalRows:2,configuredRows:1,unconfiguredRows:1,missingRouteIds:[id2],
  financialExecutionAuthorized:false,reviewOnly:true});
 for(const v of [
  {...batch,payment_execution_enabled:true},{...batch,privacy_verified:true},
  {...batch,fiat_payouts_enabled:true},{...batch,all_configured:true},
  {...batch,missing_ids:[]},{...batch,items:[corridor,corridor]},
  {...batch,items:[{...corridor,asset_code:"MONEY",fx_rate:"1.1"}]},
  {...batch,requested_ids:[id2,id]},{...batch,unexpected:"permission"}
 ])assert.equal(validCorridorBatch(v,[id,id2]),false);
 assert.throws(()=>assertBusinessRouteIds([id,id]),TypeError);
 assert.throws(()=>assertBusinessRouteIds([id2.toUpperCase()]),TypeError);
});
test("SDK fetch sends public IDs only, never private amounts or recipients",async()=>{
 let request="";
 const client=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",
  fetchImpl:async url=>{request=String(url);return new Response(JSON.stringify(batch),
   {headers:{"content-type":"application/json"}});}});
 const result=await client.corridorBatch([id,id2]);
 assert.equal(result.missing_ids[0],id2);
 assert.equal(request,"/api/bridge/v1/corridors/batch?ids="+id+","+id2);
 assert.doesNotMatch(request,/[A-Z]{40}|INV-100|12.345/);
});
