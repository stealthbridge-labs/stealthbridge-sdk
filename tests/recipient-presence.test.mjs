import {test} from "node:test";
import assert from "node:assert/strict";
import {validRecipientPresence,currentRecipientContract,StealthBridgeClient} from "../dist/index.js";
const address="CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB";
const now=1800000000;
const record={schema_version:1,network:"testnet",source:"stellar-rpc/recipient-presence",
 address,observed_at_unix:now,observed_ledger_sequence:100,
 contract_instance_found:true,smart_account_verified:false,
 signer_authority_verified:false,recipient_asset_eligibility_verified:false,
 privacy_verified:false,payment_execution_enabled:false};
test("contract presence is not a smart account and must be fresh and minimal",()=>{
 assert.equal(validRecipientPresence(record,address,now),true);
 assert.equal(currentRecipientContract(record,address,now),true);
 for(const invalid of [
  {...record,observed_at_unix:now-91},{...record,observed_at_unix:now+31},
  {...record,smart_account_verified:true},{...record,payment_execution_enabled:true},
  {...record,recipient_asset_eligibility_verified:true},
  {...record,signer_authority_verified:true},{...record,privacy_verified:true},
  {...record,executable_wasm_hash:"00".repeat(32)},{...record,address:"wrong"},
  {...record,observed_ledger_sequence:0},{...record,network:"mainnet"}
 ])assert.equal(validRecipientPresence(invalid,address,now),false);
 assert.equal(currentRecipientContract({...record,contract_instance_found:false},address,now),false);
});
test("SDK can only read recipient presence with exact validated public C address",async()=>{
 let request="";
 const api=new StealthBridgeClient({apiBaseUrl:"/api/bridge",network:"testnet",
  fetchImpl:async(url)=>{request=String(url);return new Response(JSON.stringify({
   ...record,observed_at_unix:Math.floor(Date.now()/1000)}),{headers:{"content-type":"application/json"}})}});
 const out=await api.recipientPresence(address);
 assert.equal(out.smart_account_verified,false);
 assert.equal(request,"/api/bridge/v1/wallet/recipient/"+address);
 assert.throws(()=>api.recipientPresence("not-an-address"),TypeError);
});
