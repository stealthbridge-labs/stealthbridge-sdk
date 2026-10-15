import {test} from "node:test";
import assert from "node:assert/strict";
import {
 StealthBridgeClient,ApiError,isContractStrKey,isActivityCursor,
 validateActivityPage,assertActivityFilters
} from "../dist/index.js";
const CONTRACT="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const ONE="0000000000000000100-0000000001";
const TWO="0000000000000000101-0000000001";
const fixture=(id,hash)=>({
 id,contract_id:CONTRACT,tx_hash:hash.repeat(64),
 ledger_sequence:id===ONE?100:101,observed_at_unix:"1760000000"
});
const summary={contract_id:CONTRACT,next_start_ledger:102,observed_at_unix:"1760000001"};
const page=(items=[],cursor=null)=>({
 network:"testnet",source:"stored-public-testnet-metadata",
 observation_status:"checkpoint-present",
 payment_execution_enabled:false,contracts:[summary],items,next_cursor:cursor
});
const api=(value,seen)=>new StealthBridgeClient({
 network:"testnet",apiBaseUrl:"https://api.example",
 fetchImpl:async(url,opts)=>{
  seen?.push([String(url),opts.method]);
  return new Response(JSON.stringify(value),{headers:{"content-type":"application/json"}});
 }
});
test("accepts the real public SAC StrKey checksum and rejects malformed contracts",()=>{
 assert.ok(isContractStrKey(CONTRACT));
 assert.equal(isContractStrKey(CONTRACT.slice(0,-1)+"A"),false);
 assert.equal(isContractStrKey("G"+"A".repeat(55)),false);
 assert.equal(isContractStrKey("C"+"A".repeat(55)),false);
 assert.equal(isActivityCursor(TWO+"."+CONTRACT),true);
 assert.equal(isActivityCursor(TWO),false);
});
test("loads a real public observer journal page with a GET-only contract filter",async()=>{
 const seen=[];
 const value=page([fixture(TWO,"b")]);
 const result=await api(value,seen).observerActivity({limit:2,contractId:CONTRACT});
 assert.deepEqual(result,value);
 assert.deepEqual(seen,[[
  "https://api.example/v1/observer/activity?limit=2&contract_id="+CONTRACT,"GET"
 ]]);
});
test("accepts an honest unconfigured empty observer state",async()=>{
 const value={network:"testnet",source:"stored-public-testnet-metadata",
  observation_status:"no-checkpoint",payment_execution_enabled:false,
  contracts:[],items:[],next_cursor:null};
 assert.equal(validateActivityPage(value),true);
 assert.deepEqual(await api(value).observerActivity(),value);
});
test("validates descending cursor pages and rejects swapped/jumped history",async()=>{
 const first=page([fixture(TWO,"b")],TWO+"."+CONTRACT);
 assert.ok(validateActivityPage(first,{limit:1}));
 const seen=[];
 const value=page([fixture(ONE,"a")]);
 const client=api(value,seen);
 assert.deepEqual((await client.observerActivity({limit:1,before:first.next_cursor})).items[0].id,ONE);
 assert.equal(seen[0][0],"https://api.example/v1/observer/activity?limit=1&before="+encodeURIComponent(first.next_cursor).replaceAll("%2E","."));
 const outOfOrder=page([fixture(ONE,"a"),fixture(TWO,"b")]);
 assert.equal(validateActivityPage(outOfOrder,{limit:2}),false);
 const forgedCursor=page([fixture(TWO,"b")],ONE+"."+CONTRACT);
 assert.equal(validateActivityPage(forgedCursor,{limit:1}),false);
 assert.equal(validateActivityPage(first,{limit:1,before:ONE+"."+CONTRACT}),false);
});
test("rejects payment readiness, unknown contracts, bad receipt shape and private fields",async()=>{
 for(const invalid of [
  {...page(),payment_execution_enabled:true},
  {...page(),source:"verified-private-transfer"},
  {...page(),observation_status:"no-checkpoint"},
  {...page([fixture(TWO,"b")]),contracts:[]},
  page([{...fixture(TWO,"b"),tx_hash:"not-hex"}]),
  page([{...fixture(TWO,"b"),ledger_sequence:0}]),
  page([{...fixture(TWO,"b"),contract_id:"C"+"A".repeat(55)}]),
  page([{...fixture(TWO,"b"),observed_at_unix:"not-utc"}]),
 ]){
  await assert.rejects(api(invalid).observerActivity(),e=>e instanceof ApiError&&e.status===502);
 }
});
test("bad contract, cursor and limit never touch transport",()=>{
 let requests=0;
 const client=new StealthBridgeClient({network:"testnet",apiBaseUrl:"https://api.example",
 fetchImpl:async()=>{requests++;throw Error("must not request");}});
 for(const filters of [{limit:0},{limit:26},{limit:1.5}])
  assert.throws(()=>client.observerActivity(filters),RangeError);
 for(const filters of [
  {contractId:"C"+"A".repeat(55)}, {before:"../../v1/capabilities"},
  {before:TWO+"."+CONTRACT,contractId:"C"+"A".repeat(55)}
 ]){
  assert.throws(()=>client.observerActivity(filters),TypeError);
 }
 assert.equal(assertActivityFilters({limit:25}),25);
 assert.equal(requests,0);
});
