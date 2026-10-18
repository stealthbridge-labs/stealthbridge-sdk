import {test} from "node:test";
import assert from "node:assert/strict";
import {validGovernanceRelease,StealthBridgeClient,ApiError} from "../dist/index.js";
const time=Math.floor(Date.now()/1000);
const golden={
 schema_version:1,network:"testnet",
 source:"stealthbridge-contracts/deployments/testnet/governance-deployment-evidence.v2.json",
 release_date:"2026-10-17",administrator_at_release:"GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN",
 observed_ledger_sequence:5244300,observed_ledger_closed_at_unix:String(time),
 contracts:[
 {name:"corridor-registry",contract_id:"CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB",wasm_sha256_at_release:"588d17f99850272f2f18e6ee407d94329b4f8ae415c2f6b71993cf59f4139099",deployment_tx:"0ac4094247fd50872d079c9637b0975f825f99574e6722c9c69739d8c5c143e5",deployment_ledger:5244269,deployment_transaction_confirmed:true},
 {name:"policy-registry",contract_id:"CBXWEA5PMDTBN5AN7FJYGGAPIWLRKXYHWLVWG5WOXH3HSRDB4RYTJBN5",wasm_sha256_at_release:"856186ba3dca1feff010c670bd1ae9818bf69e284304273f943745603b9a7912",deployment_tx:"34c2e84cad5be5181b7e1964d4e48e2c26ca021583373922f821c0038abce118",deployment_ledger:5244283,deployment_transaction_confirmed:true},
 {name:"governance-gate",contract_id:"CD2KIMDRYJMKGO5SMIBOQP6ADPW5I4THNZFGXWYLIPGSXAI5NRXVAPKV",wasm_sha256_at_release:"66b40fe5ee4f704a91acf39922ed130cc1eb4fc0cdc3c5ee5a30614921f4aa81",deployment_tx:"9468801411a6bbb7fb2966c0225057bb4f3c8a7113aa687c0a0be744a7c5b341",deployment_ledger:5244293,deployment_transaction_confirmed:true},
 ],
 deployment_transactions_confirmed:true,onchain_code_freshly_verified:false,
 administrator_freshly_verified:false,privacy_verified:false,
 payment_execution_enabled:false,fee_collection_enabled:false,
};
test("real release evidence passes bounded read-only validation",()=>assert.ok(validGovernanceRelease(golden)));
test("forged payment, code, admin, address, time and receipts are rejected",()=>{
 for(const field of ["payment_execution_enabled","privacy_verified","fee_collection_enabled",
   "onchain_code_freshly_verified","administrator_freshly_verified"]){
  assert.equal(validGovernanceRelease({...golden,[field]:true}),false);
 }
 for(const field of ["administrator_at_release","network","source"]){
  assert.equal(validGovernanceRelease({...golden,[field]:"fake"}),false);
 }
 assert.equal(validGovernanceRelease({...golden,observed_ledger_closed_at_unix:String(time-600)}),false);
 assert.equal(validGovernanceRelease({...golden,contracts:golden.contracts.slice(0,2)}),false);
 assert.equal(validGovernanceRelease({...golden,contracts:[{...golden.contracts[0],deployment_transaction_confirmed:false},...golden.contracts.slice(1)]}),false);
 assert.equal(validGovernanceRelease({...golden,contracts:[{...golden.contracts[0],contract_id:golden.contracts[1].contract_id},...golden.contracts.slice(1)]}),false);
});
test("SDK fetches governance receipts by safe GET only, never permits signing",async()=>{
 const requests=[];
 const client=new StealthBridgeClient({network:"testnet",apiBaseUrl:"https://api.example",fetchImpl:async(url,options)=>{
   requests.push([url,options.method]);
   return new Response(JSON.stringify(golden),{status:200,headers:{"content-type":"application/json"}});
 }});
 assert.equal((await client.governanceRelease()).contracts.length,3);
 assert.deepEqual(requests,[["https://api.example/v1/governance/release","GET"]]);
 assert.equal("claimFees" in client,false);
 assert.equal("sign" in client,false);
});
test("SDK refuses corrupted server evidence",async()=>{
 const client=new StealthBridgeClient({network:"testnet",apiBaseUrl:"https://api.example",fetchImpl:async()=>
  new Response(JSON.stringify({...golden,payment_execution_enabled:true}),{status:200})});
 await assert.rejects(client.governanceRelease(),e=>e instanceof ApiError&&e.status===502);
});
