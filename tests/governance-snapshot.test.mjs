import {test} from "node:test";
import assert from "node:assert/strict";
import {validGovernanceSnapshot,StealthBridgeClient,ApiError} from "../dist/index.js";

// Deterministic public contract identities/receipts from the verified Testnet
// governance release. Test data never represents a usable payment rail.
const contracts=[
 ["corridor-registry","CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB",
  "588d17f99850272f2f18e6ee407d94329b4f8ae415c2f6b71993cf59f4139099",
  "0ac4094247fd50872d079c9637b0975f825f99574e6722c9c69739d8c5c143e5",5244269],
 ["policy-registry","CBXWEA5PMDTBN5AN7FJYGGAPIWLRKXYHWLVWG5WOXH3HSRDB4RYTJBN5",
  "856186ba3dca1feff010c670bd1ae9818bf69e284304273f943745603b9a7912",
  "34c2e84cad5be5181b7e1964d4e48e2c26ca021583373922f821c0038abce118",5244283],
 ["governance-gate","CD2KIMDRYJMKGO5SMIBOQP6ADPW5I4THNZFGXWYLIPGSXAI5NRXVAPKV",
  "66b40fe5ee4f704a91acf39922ed130cc1eb4fc0cdc3c5ee5a30614921f4aa81",
  "9468801411a6bbb7fb2966c0225057bb4f3c8a7113aa687c0a0be744a7c5b341",5244293]
];
const admin="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
function snapshot(){
 const ledger=5244400,time=String(Math.floor(Date.now()/1000)-4);
 return {
  schema_version:1,network:"testnet",source:"stellar-rpc+stellar-horizon",
  state:"consistent-observations",
  reason:"Public same-ledger observations agree; canonical release not attested",
  observed_ledger_sequence:ledger,observed_network_head_closed_at_unix:time,
  canonical_manifest_attested:false,signer_possession_verified:false,
  trusted_for_execution:false,privacy_verified:false,
  payment_execution_enabled:false,fee_collection_enabled:false,
  release:{
   schema_version:1,network:"testnet",
   source:"stealthbridge-contracts/deployments/testnet/governance-deployment-evidence.v2.json",
   release_date:"2026-10-17",administrator_at_release:admin,
   observed_ledger_sequence:ledger,observed_ledger_closed_at_unix:time,
   contracts:contracts.map(([name,contract_id,wasm_sha256_at_release,deployment_tx,deployment_ledger])=>({
    name,contract_id,wasm_sha256_at_release,deployment_tx,deployment_ledger,deployment_transaction_confirmed:true
   })),deployment_transactions_confirmed:true,onchain_code_freshly_verified:false,
   administrator_freshly_verified:false,privacy_verified:false,
   payment_execution_enabled:false,fee_collection_enabled:false
  },
  code:{
   schema_version:1,network:"testnet",source:"stellar-rpc/getLedgerEntries",
   observed_ledger_sequence:ledger,
   contracts:contracts.map(([name,contract_id,hash])=>({
    name,contract_id,current_executable_wasm_hash:hash,
    release_executable_wasm_hash:hash,matches_reviewed_release:true,
    last_modified_ledger:5244300,live_until_ledger:5300000
   })),all_executable_hashes_match_release:true,
   current_administrator_verified:false,wasm_bytes_freshly_downloaded:false,
   privacy_verified:false,payment_execution_enabled:false,fee_collection_enabled:false
  },
  administrators:{
   schema_version:1,network:"testnet",
   source:"stellar-rpc/getLedgerEntries/contract-instance-storage",
   observed_ledger_sequence:ledger,observed_ledger_closed_at_unix:time,
   reviewed_release_executable_hashes_confirmed:true,
   administrator_entries_read_from_current_storage:true,
   same_administrator_for_all_contracts:true,all_administrators_match_deployment:true,
   release_administrator:admin,
   contracts:contracts.map(([name,contract_id],i)=>({
    name,contract_id,current_administrator:admin,pending_administrator:null,
    paused:i===2?null:false,matches_deployment_administrator:true
   })),signer_possession_verified:false,fee_collection_enabled:false,
   payment_execution_enabled:false,privacy_verified:false
  }
 };
}
test("atomic governance observations may agree but never become executable",()=>{
 const s=snapshot();
 assert.equal(validGovernanceSnapshot(s),true);
 assert.equal(s.trusted_for_execution,false);
 for(const modify of [
  v=>v.trusted_for_execution=true,
  v=>v.payment_execution_enabled=true,
  v=>v.canonical_manifest_attested=true,
  v=>v.administrators.contracts[0].pending_administrator=admin,
  v=>v.code.observed_ledger_sequence+=1,
  v=>v.release.contracts[1].contract_id=v.release.contracts[0].contract_id,
  v=>v.observed_network_head_closed_at_unix=String(Math.floor(Date.now()/1000)-500),
  v=>v.network="public",
  v=>v.reason="signed and authorized for payments"
 ]){
  const forged=structuredClone(s);modify(forged);
  assert.equal(validGovernanceSnapshot(forged),false);
 }
});
test("SDK only sends safe GET snapshot reads; invalid responses throw",async()=>{
 const calls=[];
 const client=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",
  fetchImpl:async(url,init)=>{
   calls.push([url,init.method]);
   return new Response(JSON.stringify(snapshot()),{headers:{"content-type":"application/json"}});
  }
 });
 assert.equal((await client.governanceSnapshot()).state,"consistent-observations");
 assert.deepEqual(calls,[["/api/bridge/v1/governance/snapshot","GET"]]);
 assert.equal("claimFees" in client,false);
 assert.equal("sign" in client,false);
 const bad=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",
  fetchImpl:async()=>new Response(JSON.stringify({payment_execution_enabled:true}),{
   headers:{"content-type":"application/json"}
  })
 });
 await assert.rejects(bad.governanceSnapshot(),ApiError);
});
