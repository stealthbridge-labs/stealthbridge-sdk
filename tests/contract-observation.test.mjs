import {test} from "node:test";
import assert from "node:assert/strict";
import {StealthBridgeClient,validContractObservation,activePublicContractAtAddress} from "../dist/index.js";

const C="CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB";
const observation=()=>({
 schema_version:1,network:"testnet",source:"stellar-rpc/getLedgerEntries",
 contract_address:C,contract_instance_found:true,observed_ledger_sequence:5244400,
 executable_wasm_hash:"a".repeat(64),live_until_ledger:5300000,
 smart_account_verified:false,signer_authority_verified:false,
 privacy_verified:false,payment_execution_enabled:false,fee_collection_enabled:false
});
test("contract presence never proves smart-account control or private-payment authority",()=>{
 const v=observation();
 assert.equal(validContractObservation(v,C),true);
 for(const flag of ["smart_account_verified","signer_authority_verified","privacy_verified",
  "payment_execution_enabled","fee_collection_enabled"]){
  const changed={...v,[flag]:true};
  assert.equal(validContractObservation(changed,C),false);
 }
 assert.equal(validContractObservation({...v,contract_address:"not-matching"},C),false);
 assert.equal(validContractObservation({...v,contract_instance_found:false,executable_wasm_hash:null,live_until_ledger:null},C),true);
});
test("SDK contract inspection is a single validated GET only",async()=>{
 const calls=[];
 const client=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",
  fetchImpl:async(url,request)=>{
   calls.push([url,request.method]);
   return new Response(JSON.stringify(observation()),{headers:{"content-type":"application/json"}});
  }});
 assert.equal((await client.contractObservation(C)).contract_instance_found,true);
 assert.deepEqual(calls,[["/api/bridge/v1/wallet/contracts/"+C,"GET"]]);
 assert.throws(()=>client.contractObservation("not-an-address"),TypeError);
});

test("contract recipient presence is address-bound and never grants transfer authority",()=>{
 const present=observation();
 assert.equal(activePublicContractAtAddress(present,C),true);
 assert.equal(activePublicContractAtAddress({...present,contract_address:"C".repeat(56)},C),false);
 assert.equal(activePublicContractAtAddress({...present,contract_instance_found:false,executable_wasm_hash:null,live_until_ledger:null},C),false);
 assert.equal(activePublicContractAtAddress({...present,live_until_ledger:present.observed_ledger_sequence-1},C),false);
 assert.equal(activePublicContractAtAddress({...present,smart_account_verified:true},C),false);
 assert.equal(activePublicContractAtAddress(null,C),false);
});
