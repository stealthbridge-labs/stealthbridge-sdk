import {test} from "node:test";
import assert from "node:assert/strict";
import {validGovernanceCode,StealthBridgeClient,ApiError} from "../dist/index.js";
const H=[
 ["corridor-registry","CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB","588d17f99850272f2f18e6ee407d94329b4f8ae415c2f6b71993cf59f4139099"],
 ["policy-registry","CBXWEA5PMDTBN5AN7FJYGGAPIWLRKXYHWLVWG5WOXH3HSRDB4RYTJBN5","856186ba3dca1feff010c670bd1ae9818bf69e284304273f943745603b9a7912"],
 ["governance-gate","CD2KIMDRYJMKGO5SMIBOQP6ADPW5I4THNZFGXWYLIPGSXAI5NRXVAPKV","66b40fe5ee4f704a91acf39922ed130cc1eb4fc0cdc3c5ee5a30614921f4aa81"]
];
const golden={
 schema_version:1,network:"testnet",source:"stellar-rpc/getLedgerEntries",
 observed_ledger_sequence:5244400,
 contracts:H.map(([name,contract_id,hash])=>({
  name,contract_id,current_executable_wasm_hash:hash,release_executable_wasm_hash:hash,
  matches_reviewed_release:true,last_modified_ledger:5244300,live_until_ledger:5260000,
 })),
 all_executable_hashes_match_release:true,
 current_administrator_verified:false,wasm_bytes_freshly_downloaded:false,
 privacy_verified:false,payment_execution_enabled:false,fee_collection_enabled:false
};
test("pinned current executable hashes can be observed without wallet control",()=>{
 assert.equal(validGovernanceCode(golden),true);
});
test("correctly validated observable upgrade changes no permission",()=>{
 const contracts=structuredClone(golden.contracts);
 contracts[1].current_executable_wasm_hash="c".repeat(64);
 contracts[1].matches_reviewed_release=false;
 assert.equal(validGovernanceCode({...golden,contracts,all_executable_hashes_match_release:false}),true);
});
test("cannot forge current WASM match, admin claim, or payment readiness",()=>{
 for(const field of ["privacy_verified","payment_execution_enabled","fee_collection_enabled",
 "current_administrator_verified","wasm_bytes_freshly_downloaded"]){
  assert.equal(validGovernanceCode({...golden,[field]:true}),false);
 }
 assert.equal(validGovernanceCode({...golden,all_executable_hashes_match_release:false}),false);
 assert.equal(validGovernanceCode({...golden,contracts:golden.contracts.slice(0,2)}),false);
 assert.equal(validGovernanceCode({...golden,contracts:[{...golden.contracts[0],current_executable_wasm_hash:"f".repeat(64)},...golden.contracts.slice(1)]}),false);
 assert.equal(validGovernanceCode({...golden,contracts:[{...golden.contracts[0],live_until_ledger:5244399},...golden.contracts.slice(1)]}),false);
 assert.equal(validGovernanceCode({...golden,contracts:[golden.contracts[1],golden.contracts[0],golden.contracts[2]]}),false);
});
test("SDK uses read-only path and rejects malicious current-code payload",async()=>{
 let calls=[];
 const client=new StealthBridgeClient({network:"testnet",apiBaseUrl:"https://api.example",fetchImpl:async(u,o)=>{
  calls.push([u,o.method]);return new Response(JSON.stringify(golden),{status:200});
 }});
 assert.equal((await client.governanceCode()).all_executable_hashes_match_release,true);
 assert.deepEqual(calls,[["https://api.example/v1/governance/code","GET"]]);
 assert.equal("sign" in client,false);
 assert.equal("claimFees" in client,false);
 const bad=new StealthBridgeClient({network:"testnet",apiBaseUrl:"https://api.example",fetchImpl:async()=>
  new Response(JSON.stringify({...golden,fee_collection_enabled:true}),{status:200})});
 await assert.rejects(bad.governanceCode(),e=>e instanceof ApiError&&e.status===502);
});
