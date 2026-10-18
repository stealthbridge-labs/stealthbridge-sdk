import {test} from "node:test";
import assert from "node:assert/strict";
import {validGovernanceAdministrator,StealthBridgeClient,ApiError} from "../dist/index.js";
const RELEASE="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
const NEXT="GBBCOFZZ3RDQHTC662EVM3UO5SAXQEZB6DL64HLEJYEYJ4KBVL3CDLTE";
const C=[
 ["corridor-registry","CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB"],
 ["policy-registry","CBXWEA5PMDTBN5AN7FJYGGAPIWLRKXYHWLVWG5WOXH3HSRDB4RYTJBN5"],
 ["governance-gate","CD2KIMDRYJMKGO5SMIBOQP6ADPW5I4THNZFGXWYLIPGSXAI5NRXVAPKV"]
];
const golden={
 schema_version:1,network:"testnet",
 source:"stellar-rpc/getLedgerEntries/contract-instance-storage",
 observed_ledger_sequence:5300000,
 reviewed_release_executable_hashes_confirmed:true,
 administrator_entries_read_from_current_storage:true,
 same_administrator_for_all_contracts:true,
 all_administrators_match_deployment:true,
 release_administrator:RELEASE,
 contracts:C.map(([name,contract_id],i)=>({
  name,contract_id,current_administrator:RELEASE,
  pending_administrator:null,paused:i===2?null:false,
  matches_deployment_administrator:true
 })),
 signer_possession_verified:false,fee_collection_enabled:false,
 payment_execution_enabled:false,privacy_verified:false
};
test("strictly validates current Testnet stored governance admin observations",()=>{
 assert.equal(validGovernanceAdministrator(golden),true);
});
test("authorized administrator migration and staged recovery are visible without custody",()=>{
 const records=structuredClone(golden.contracts);
 records[0].pending_administrator=NEXT;
 assert.equal(validGovernanceAdministrator({...golden,contracts:records}),true);
 records[0].current_administrator=NEXT;
 records[0].pending_administrator=null;
 records[0].matches_deployment_administrator=false;
 assert.equal(validGovernanceAdministrator({...golden,contracts:records,
  same_administrator_for_all_contracts:false,all_administrators_match_deployment:false}),true);
});
test("fails closed on forged ownership, mismatched contract and invalid recovery",()=>{
 for(const f of ["signer_possession_verified","privacy_verified","fee_collection_enabled","payment_execution_enabled"]){
  assert.equal(validGovernanceAdministrator({...golden,[f]:true}),false);
 }
 assert.equal(validGovernanceAdministrator({...golden,same_administrator_for_all_contracts:false}),false);
 assert.equal(validGovernanceAdministrator({...golden,contracts:[
  {...golden.contracts[0],current_administrator:NEXT},...golden.contracts.slice(1)]}),false);
 assert.equal(validGovernanceAdministrator({...golden,contracts:[
  {...golden.contracts[0],pending_administrator:"G".repeat(56)},...golden.contracts.slice(1)]}),false);
 assert.equal(validGovernanceAdministrator({...golden,contracts:[
  {...golden.contracts[0],paused:null},...golden.contracts.slice(1)]}),false);
 assert.equal(validGovernanceAdministrator({...golden,contracts:[
  ...golden.contracts.slice(0,2),{...golden.contracts[2],pending_administrator:NEXT}]}),false);
});
test("SDK exposes only GET observation, never claim or signing",async()=>{
 const calls=[];
 const good=new StealthBridgeClient({apiBaseUrl:"https://api.example",network:"testnet",
  fetchImpl:async (url,opts)=>{
   calls.push([url,opts.method]);
   return new Response(JSON.stringify(golden),{status:200,headers:{"content-type":"application/json"}});
  }});
 assert.equal((await good.governanceAdministrator()).contracts.length,3);
 assert.deepEqual(calls,[["https://api.example/v1/governance/admin","GET"]]);
 assert.equal("sign" in good,false);assert.equal("claimFees" in good,false);
 const bad=new StealthBridgeClient({apiBaseUrl:"https://api.example",network:"testnet",
  fetchImpl:async()=>new Response(JSON.stringify({...golden,signer_possession_verified:true}),{
   status:200,headers:{"content-type":"application/json"}
  })});
 await assert.rejects(bad.governanceAdministrator(),e=>e instanceof ApiError&&e.status===502);
});
