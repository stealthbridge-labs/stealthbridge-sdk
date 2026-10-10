import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {StealthBridgeClient,ApiError} from "../dist/index.js";
const undeployed={
 schemaVersion:1,network:"testnet",status:"not-deployed",verified:false,
 contractAddresses:{},assetIssuers:{},txHashes:[],
 notes:"No contract deployment asserted"
};
const interfaceData=JSON.parse(readFileSync(new URL("../specs/public-soroban-interface.v1.json",import.meta.url),"utf8"));
const response={public_interface:interfaceData,network:"testnet",source:"stealthbridge-contracts/deployments/testnet/manifest.json",
 manifest:undeployed,on_chain_verified:false,payment_execution_enabled:false};
function client(payload){
 return new StealthBridgeClient({network:"testnet",apiBaseUrl:"https://api.example",
  fetchImpl:async()=>new Response(JSON.stringify(payload),{headers:{"content-type":"application/json"}})});
}
test("SDK discovers actual undeployed contracts without synthesizing IDs",async()=>{
 const discovered=await client(response).contracts();
 assert.equal(discovered.manifest.status,"not-deployed");
 assert.deepEqual(discovered.manifest.contractAddresses,{});
 assert.equal(discovered.on_chain_verified,false);
});
test("a false on-chain verification or payment claim fails closed",async()=>{
 for(const value of [
 {...response,on_chain_verified:true},
 {...response,payment_execution_enabled:true},
 {...response,manifest:{...undeployed,verified:true}},
 {...response,manifest:{...undeployed,status:"deployed"}},
 {...response,network:"public"},
 ]){
  await assert.rejects(client(value).contracts(),e=>e instanceof ApiError&&e.status===502);
 }
});

test("source method inventory is validated and rejects invented signatures",async()=>{
 const item=await client(response).contracts();
 assert.ok(item.public_interface.contracts["corridor-registry"].reads.is_enabled);
 assert.ok(item.public_interface.contracts["governance-gate"].reads.public_flags_allow);
 const forged=JSON.parse(JSON.stringify(response));
 forged.public_interface.contracts["corridor-registry"].reads.transfer_funds={args:["String"],returns:"bool"};
 await assert.rejects(client(forged).contracts(),e=>e instanceof ApiError&&e.status===502);
 const wrongSource=JSON.parse(JSON.stringify(response));
 wrongSource.public_interface.contracts["corridor-registry"].source="contracts/unknown/src/lib.rs";
 await assert.rejects(client(wrongSource).contracts(),e=>e instanceof ApiError&&e.status===502);
 const inventedWrite=JSON.parse(JSON.stringify(response));
 inventedWrite.public_interface.contracts["policy-registry"].writes.push("transfer_funds");
 await assert.rejects(client(inventedWrite).contracts(),e=>e instanceof ApiError&&e.status===502);
});

test("canonical discovery rejects a claimed deployed manifest without independent verification",async()=>{
 const claimed={...response,manifest:{
  schemaVersion:2,network:"testnet",networkPassphrase:"Test SDF Network ; September 2015",
  status:"deployed",verified:true,protocolVersion:1,apiVersion:1,sourceRevision:"a".repeat(40),
  contractAddresses:{registry:"C"+"A".repeat(55)},abiDigests:{registry:"b".repeat(64)},
  wasmDigests:{registry:"c".repeat(64)},assetIssuers:{},txHashes:["d".repeat(64)]
 }};
 await assert.rejects(client(claimed).contracts(),e=>e instanceof ApiError&&e.status===502);
});
